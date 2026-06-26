import type { ServerResponse } from "http";
import { db } from "@workspace/db";
import { waSessionsTable, waInboundLeadsTable, waInboundMessagesTable, sellersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  uploadAllSessionFiles,
  downloadSessionFromStorage,
  deleteSessionFromStorage,
} from "./waAuthState.js";

const SESSION_LOCAL_DIR = "/tmp/wa-session";

export type WAStatus = "disconnected" | "connecting" | "connected";

interface WAState {
  status: WAStatus;
  qr: string | null;
  phone: string | null;
  connectedAt: Date | null;
}

const state: WAState = {
  status: "disconnected",
  qr: null,
  phone: null,
  connectedAt: null,
};

const sseClients = new Set<ServerResponse>();
let sock: any = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isLoggedOut = false;

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

    // Wrap saveCreds: save locally first, then mirror to object storage (non-blocking)
    const saveCredsAndBackup = async () => {
      await saveCreds();
      uploadAllSessionFiles(SESSION_LOCAL_DIR).catch((e) =>
        console.error("[WA] Storage backup error:", e),
      );
    };

    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger: silentLogger as any,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCredsAndBackup);

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
        broadcast({ type: "state", ...state });
        await updateSessionInDB({ status: "connected", phone, connectedAt: new Date() });
        console.log(`[WA] Connected as ${phone}`);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        state.status = "disconnected";
        state.phone = null;
        state.qr = null;
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
          // Transient disconnect (408, network blip, etc.) — reconnect after 8s
          reconnectTimer = setTimeout(() => connectWA(), 8000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }: any) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const rawJid = msg.key.remoteJid ?? "";
        const phone = rawJid.split("@")[0];
        if (!phone || phone.includes("-")) continue;

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
  broadcast({ type: "state", ...state });
  await updateSessionInDB({ status: "disconnected", phone: null, connectedAt: null });

  const { rm } = await import("fs/promises");
  await rm(SESSION_LOCAL_DIR, { recursive: true, force: true }).catch(() => {});
  await deleteSessionFromStorage();
}

export async function sendWAMessage(phone: string, message: string): Promise<void> {
  if (!sock || state.status !== "connected") {
    throw new Error("WhatsApp not connected");
  }
  const jid = `${phone}@s.whatsapp.net`;

  try {
    await sock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    await sock.sendPresenceUpdate("paused", jid);
  } catch {}

  await sock.sendMessage(jid, { text: message });
}

export async function sendWAMediaMessage(
  phone: string,
  objectPath: string,
  mediaType: string,
  caption: string,
  filename: string | null,
): Promise<void> {
  if (!sock || state.status !== "connected") {
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
    await sock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 5000));
    await sock.sendPresenceUpdate("paused", jid);
  } catch {}

  if (mediaType === "image") {
    await sock.sendMessage(jid, { image: fileBuffer, caption, mimetype });
  } else if (mediaType === "video") {
    await sock.sendMessage(jid, { video: fileBuffer, caption, mimetype });
  } else {
    await sock.sendMessage(jid, {
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
