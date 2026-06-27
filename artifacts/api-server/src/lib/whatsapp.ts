import type { ServerResponse } from "http";
import { db } from "@workspace/db";
import { waSessionsTable, waInboundLeadsTable, waInboundMessagesTable, sellersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  uploadCredsToStorage,
  downloadSessionFromStorage,
  deleteSessionFromStorage,
} from "./waAuthState.js";

const SESSION_LOCAL_DIR = process.env.WA_SESSION_DIR ?? "/data/wa-session";

export type WAStatus = "disconnected" | "connecting" | "connected";

interface WAState {
  status: WAStatus;
  qr: string | null;
  phone: string | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
}

const state: WAState = {
  status: "disconnected",
  qr: null,
  phone: null,
  connectedAt: null,
  disconnectedAt: null,
};

const sseClients = new Set<ServerResponse>();
let sock: any = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isLoggedOut = false;

// Hook called immediately after WA connects — used by the campaign scheduler
// to flush any pending messages without waiting for the next 60s tick.
let onConnectHook: (() => void) | null = null;
export function setOnConnectHook(fn: () => void): void {
  onConnectHook = fn;
}

// Multi-device Baileys: contacts arrive with @lid JIDs, not @s.whatsapp.net.
// We build a lid→phone map from contacts.upsert/contacts.update so we can
// resolve the actual phone number when a message arrives with an @lid JID.
const lidToPhone: Record<string, string> = {};

function updateLidMap(contacts: any[]): void {
  for (const c of contacts) {
    const id: string = c.id ?? "";
    const lid: string = c.lid ?? "";
    // contacts.upsert gives us both id (@s.whatsapp.net) and lid (@lid)
    if (id.endsWith("@s.whatsapp.net") && lid) {
      const phone = id.split("@")[0].split(":")[0];
      lidToPhone[lid] = phone;
    }
    // Sometimes the contact entry itself is the @lid and name/phone are inline
    if (id.endsWith("@lid") && c.notify) {
      // keep as-is; phone is unknown without the paired @s.whatsapp.net entry
    }
  }
}

const silentLogger = {
  level: "silent",
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => silentLogger,
};

export function getWAState(): WAState {
  return { ...state };
}

export function addSSEClient(res: ServerResponse): void {
  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: "state", ...state })}\n\n`);
}

export function removeSSEClient(res: ServerResponse): void {
  sseClients.delete(res);
}

function broadcast(payload: object): void {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of [...sseClients]) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function updateSessionInDB(
  data: Partial<{ phone: string | null; status: string; connectedAt: Date | null }>,
): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: waSessionsTable.id })
      .from(waSessionsTable)
      .limit(1);
    if (existing) {
      await db
        .update(waSessionsTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(waSessionsTable.id, existing.id));
    } else {
      await db.insert(waSessionsTable).values(data as any);
    }
  } catch (e) {
    console.error("[WA] DB update error:", e);
  }
}

export async function getOrCreateSession(): Promise<typeof waSessionsTable.$inferSelect> {
  const [session] = await db
    .select()
    .from(waSessionsTable)
    .orderBy(desc(waSessionsTable.id))
    .limit(1);
  if (session) return session;
  const [created] = await db.insert(waSessionsTable).values({}).returning();
  return created;
}

export async function connectWA(): Promise<void> {
  if (state.status === "connected" || state.status === "connecting") return;

  isLoggedOut = false;
  state.status = "connecting";
  state.qr = null;
  broadcast({ type: "state", ...state });

  try {
    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
    } = await import("@whiskeysockets/baileys");
    const QRCode = await import("qrcode");
    const { mkdir, rm } = await import("fs/promises");

    await mkdir(SESSION_LOCAL_DIR, { recursive: true });
    const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_LOCAL_DIR);

    // Wrap saveCreds: save locally first, then mirror creds.json to object storage (non-blocking)
    const saveCredsAndBackup = async () => {
      await saveCreds();
      uploadCredsToStorage(SESSION_LOCAL_DIR).catch((e) =>
        console.error("[WA] Storage backup error:", e),
      );
    };

    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger: silentLogger as any,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      // Stable browser identity — prevents WhatsApp treating every reconnect
      // as a brand-new session and kicking it immediately after (Code 440)
      browser: ["Chatcart", "Chrome", "120.0.0"],
    });

    sock.ev.on("creds.update", saveCredsAndBackup);

    // Build LID→phone map so messages arriving with @lid JIDs can be resolved.
    // Three sources in Baileys:
    //  - messaging-history.set  : bulk contacts on reconnect / history sync
    //  - contacts.upsert        : real-time new contacts
    //  - contacts.update        : real-time contact edits
    sock.ev.on("messaging-history.set", ({ contacts }: any) => {
      const arr: any[] = contacts ?? [];
      if (arr.length > 0) {
        console.log(`[WA] messaging-history.set sample contact:`, JSON.stringify(arr[0]));
      }
      updateLidMap(arr);
      console.log(`[WA] messaging-history.set: ${arr.length} contacts, lid map size=${Object.keys(lidToPhone).length}`);
    });
    sock.ev.on("contacts.upsert", (contacts: any[]) => {
      if (contacts.length > 0) {
        console.log(`[WA] contacts.upsert sample:`, JSON.stringify(contacts[0]));
      }
      updateLidMap(contacts);
      console.log(`[WA] contacts.upsert: ${contacts.length} contacts, lid map size=${Object.keys(lidToPhone).length}`);
    });
    sock.ev.on("contacts.update", (updates: any[]) => {
      updateLidMap(updates);
    });

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await (QRCode.default || QRCode).toDataURL(qr, { width: 256 });
          state.qr = dataUrl;
          broadcast({ type: "qr", qr: dataUrl });
        } catch (e) {
          console.error("[WA] QR generation error:", e);
        }
      }

      if (connection === "open") {
        const jid = sock?.user?.id ?? null;
        const phone = jid ? jid.split(":")[0].split("@")[0] : null;
        state.status = "connected";
        state.qr = null;
        state.phone = phone;
        state.connectedAt = new Date();
        state.disconnectedAt = null;
        broadcast({ type: "state", ...state });
        await updateSessionInDB({ status: "connected", phone, connectedAt: new Date() });
        console.log(`[WA] Connected as ${phone}`);
        // Flush any due campaign messages immediately rather than waiting for the next tick
        if (onConnectHook) setTimeout(onConnectHook, 2000);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        state.status = "disconnected";
        state.phone = null;
        state.qr = null;
        state.disconnectedAt = new Date();
        sock = null;
        broadcast({ type: "state", ...state });
        await updateSessionInDB({ status: "disconnected", phone: null });

        console.log(`[WA] Closed. LoggedOut=${loggedOut} Code=${statusCode}`);

        if (loggedOut) {
          isLoggedOut = true;
          // Delete local session files
          await rm(SESSION_LOCAL_DIR, { recursive: true, force: true }).catch(() => {});
          // Delete from object storage so next boot doesn't try to restore a dead session
          deleteSessionFromStorage().catch(() => {});
        } else if (!isLoggedOut) {
          // Code 440 = connectionReplaced — another WhatsApp Web tab / device opened the
          // same number and kicked us. Back off for 60s to avoid a flip-flop loop where
          // the phone keeps kicking our reconnects. Any other transient error (408 timeout,
          // 503 server unavailable, network blip) retries quickly after 8s.
          const delayMs = statusCode === 440 ? 60_000 : 8_000;
          console.log(`[WA] Reconnecting in ${delayMs / 1000}s (code=${statusCode})`);
          reconnectTimer = setTimeout(() => connectWA(), delayMs);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
      console.log(`[WA] messages.upsert type=${type} count=${messages.length}`);
      // "notify" = real-time new messages; "append" = history sync on reconnect — skip those
      if (type !== "notify") {
        console.log(`[WA] Skipping non-notify batch (type=${type})`);
        return;
      }
      for (const msg of messages) {
        const rawJid = msg.key.remoteJid ?? "";
        if (msg.key.fromMe) continue;

        let phone: string | null = null;

        if (rawJid.endsWith("@s.whatsapp.net")) {
          // Standard JID — phone number is the prefix
          phone = rawJid.split("@")[0].split(":")[0];
        } else if (rawJid.endsWith("@lid")) {
          // Multi-device LID — Baileys stores the reverse mapping in authState.keys
          // under key type 'lid-mapping' with key '{lidUser}_reverse' → pnUser.
          // This is populated by Baileys during message decryption (before this event fires).
          const lidUser = rawJid.split("@")[0];
          try {
            const result = await authState.keys.get("lid-mapping", [`${lidUser}_reverse`]);
            const pnUser = result[`${lidUser}_reverse`];
            if (pnUser && typeof pnUser === "string") {
              phone = pnUser;
              console.log(`[WA] resolved @lid ${rawJid} → phone=${pnUser}`);
            } else {
              console.log(`[WA] @lid not in key store yet: ${rawJid} (result=${JSON.stringify(result)})`);
              continue;
            }
          } catch (e) {
            console.error(`[WA] key store lookup failed for ${rawJid}:`, e);
            continue;
          }
        } else {
          // Group, broadcast, status — ignore
          continue;
        }

        if (!phone) continue;
        console.log(`[WA] inbound from phone=${phone} jid=${rawJid}`);

        const displayName: string = msg.pushName ?? "";
        const msgContent =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          "";

        await Promise.all([
          handleIncomingReply(phone).catch((e) =>
            console.error("[WA] Reply handler error:", e),
          ),
          handleInboundLead(phone, displayName, msgContent).catch((e) =>
            console.error("[WA] Inbound lead handler error:", e),
          ),
        ]);
      }
    });
  } catch (e) {
    console.error("[WA] Connect error:", e);
    state.status = "disconnected";
    state.disconnectedAt = new Date();
    broadcast({ type: "state", ...state });
  }
}

export async function disconnectWA(): Promise<void> {
  isLoggedOut = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      await sock.logout();
    } catch {}
    sock = null;
  }
  state.status = "disconnected";
  state.phone = null;
  state.qr = null;
  state.disconnectedAt = new Date();
  broadcast({ type: "state", ...state });
  await updateSessionInDB({ status: "disconnected", phone: null, connectedAt: null });

  const { rm } = await import("fs/promises");
  await rm(SESSION_LOCAL_DIR, { recursive: true, force: true }).catch(() => {});
  await deleteSessionFromStorage();
}

export async function sendWAMessage(phone: string, message: string): Promise<void> {
  // Capture sock reference BEFORE any async delay. If the connection drops while
  // we are simulating typing (2–5s), the module-level `sock` becomes null but our
  // local reference is still valid — we check state.status after the delay to
  // detect that case and throw cleanly instead of crashing on null.sendMessage().
  const localSock = sock;
  if (!localSock || state.status !== "connected") {
    throw new Error("WhatsApp not connected");
  }
  const jid = `${phone}@s.whatsapp.net`;

  try {
    await localSock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    await localSock.sendPresenceUpdate("paused", jid);
  } catch {}

  // Re-check: connection might have dropped during the typing simulation delay
  if (state.status !== "connected") {
    throw new Error("WhatsApp disconnected during send");
  }

  await localSock.sendMessage(jid, { text: message });
}

export async function sendWAMediaMessage(
  phone: string,
  objectPath: string,
  mediaType: string,
  caption: string,
  filename: string | null,
): Promise<void> {
  const localSock = sock;
  if (!localSock || state.status !== "connected") {
    throw new Error("WhatsApp not connected");
  }
  const jid = `${phone}@s.whatsapp.net`;

  // Download media from object storage into a Buffer (avoids need for public URL)
  const { ObjectStorageService } = await import("./objectStorage.js");
  const storageService = new ObjectStorageService();
  const file = await storageService.getObjectEntityFile(objectPath);
  const [fileBuffer] = (await (file as any).download()) as [Buffer];
  const [meta] = await (file as any).getMetadata();
  const mimetype: string = (meta.contentType as string) || "application/octet-stream";

  // Simulate composing presence — extended delay accommodates realistic media typing time
  try {
    await localSock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 5000));
    await localSock.sendPresenceUpdate("paused", jid);
  } catch {}

  // Re-check: connection might have dropped during the typing simulation delay
  if (state.status !== "connected") {
    throw new Error("WhatsApp disconnected during send");
  }

  if (mediaType === "image") {
    await localSock.sendMessage(jid, { image: fileBuffer, caption, mimetype });
  } else if (mediaType === "video") {
    await localSock.sendMessage(jid, { video: fileBuffer, caption, mimetype });
  } else {
    await localSock.sendMessage(jid, {
      document: fileBuffer,
      mimetype,
      fileName: filename ?? "attachment",
      caption,
    });
  }
}

async function handleIncomingReply(fromPhone: string): Promise<void> {
  const { waCampaignLeadsTable, sellersTable } = await import("@workspace/db/schema");
  const { eq: eqDrizzle } = await import("drizzle-orm");

  const leads = await db
    .select({
      id: waCampaignLeadsTable.id,
      status: waCampaignLeadsTable.status,
    })
    .from(waCampaignLeadsTable)
    .innerJoin(sellersTable, eqDrizzle(waCampaignLeadsTable.sellerId, sellersTable.id))
    .where(eqDrizzle(sellersTable.phone, `+${fromPhone}`));

  for (const lead of leads) {
    const updateData: Record<string, any> = { repliedAt: new Date() };
    if (lead.status === "paused_no_reply") {
      updateData.status = "active";
      updateData.nextSendAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    }
    await db
      .update(waCampaignLeadsTable)
      .set(updateData)
      .where(eqDrizzle(waCampaignLeadsTable.id, lead.id));
  }

  if (leads.length > 0) {
    console.log(`[WA] Marked ${leads.length} lead(s) as replied for phone +${fromPhone}`);
  }
}

async function handleInboundLead(fromPhone: string, displayName: string, messageText: string): Promise<void> {
  const normalizedPhone = `+${fromPhone}`;

  const [matchedSeller] = await db
    .select({ id: sellersTable.id })
    .from(sellersTable)
    .where(eq(sellersTable.phone, normalizedPhone))
    .limit(1);

  const matchedSellerId = matchedSeller?.id ?? null;

  const [existing] = await db
    .select({ id: waInboundLeadsTable.id })
    .from(waInboundLeadsTable)
    .where(eq(waInboundLeadsTable.phone, fromPhone))
    .limit(1);

  let leadId: number;

  if (existing) {
    await db
      .update(waInboundLeadsTable)
      .set({
        displayName: displayName || undefined,
        lastMessage: messageText || null,
        lastMessageAt: new Date(),
        matchedSellerId: matchedSellerId ?? undefined,
        messageCount: sql`${waInboundLeadsTable.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(waInboundLeadsTable.id, existing.id));
    leadId = existing.id;
    console.log(`[WA] Inbound message from existing lead +${fromPhone} (lead ${leadId})`);
  } else {
    const [created] = await db
      .insert(waInboundLeadsTable)
      .values({
        phone: fromPhone,
        displayName: displayName || null,
        firstMessage: messageText || null,
        lastMessage: messageText || null,
        lastMessageAt: new Date(),
        matchedSellerId,
        messageCount: 1,
        isWarm: true,
      })
      .returning({ id: waInboundLeadsTable.id });
    leadId = created.id;
    console.log(`[WA] New inbound lead +${fromPhone} (lead ${leadId}, seller=${matchedSellerId ?? "none"})`);
  }

  if (messageText) {
    await db.insert(waInboundMessagesTable).values({
      inboundLeadId: leadId,
      message: messageText,
      receivedAt: new Date(),
    });
  }

  broadcast({ type: "inbound_lead", leadId, phone: fromPhone, displayName, matchedSellerId });
}

export async function initWA(): Promise<void> {
  // In development, skip auto-connect entirely. The dev API server and the
  // production deployment share the same WhatsApp account. If both auto-connect
  // they kick each other every ~60s with Code 440 (connectionReplaced), causing
  // continuous send failures. Production handles the live session; dev stays dark
  // unless the admin manually clicks "Connect" in the WA Marketing panel.
  if (process.env.NODE_ENV !== "production") {
    console.log("[WA] Dev mode — auto-connect skipped (prevents Code 440 loop with production)");
    return;
  }

  // 1. Check local working dir first (survives process restarts within same container)
  try {
    const { access } = await import("fs/promises");
    await access(`${SESSION_LOCAL_DIR}/creds.json`);
    console.log("[WA] Local session found, reconnecting…");
    connectWA();
    return;
  } catch {}

  // 2. Restore from object storage (survives container replacements)
  const restored = await downloadSessionFromStorage();
  if (restored) {
    console.log("[WA] Session restored from object storage, reconnecting…");
    connectWA();
    return;
  }

  console.log("[WA] No existing session — scan QR to connect");
}
