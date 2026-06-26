import path from "path";
import { fileURLToPath } from "url";
import type { ServerResponse } from "http";
import { db } from "@workspace/db";
import { waSessionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.resolve(__dirname, "../../wa-session");

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
    const { mkdir } = await import("fs/promises");

    await mkdir(SESSION_DIR, { recursive: true });
    const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger: silentLogger as any,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCreds);

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
          const { rm } = await import("fs/promises");
          await rm(SESSION_DIR, { recursive: true, force: true }).catch(() => {});
        } else if (!isLoggedOut) {
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
        await handleIncomingReply(phone).catch((e) =>
          console.error("[WA] Reply handler error:", e),
        );
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
  await rm(SESSION_DIR, { recursive: true, force: true }).catch(() => {});
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

export async function initWA(): Promise<void> {
  try {
    const { access } = await import("fs/promises");
    await access(SESSION_DIR);
    console.log("[WA] Existing session found, reconnecting…");
    connectWA();
  } catch {
    console.log("[WA] No existing session");
  }
}
