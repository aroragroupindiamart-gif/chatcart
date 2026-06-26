import { db } from "@workspace/db";
import {
  waCampaignLeadsTable,
  waSequenceStepsTable,
  waSendLogTable,
  waSessionsTable,
  sellersTable,
} from "@workspace/db/schema";
import { eq, and, lte, count, gte } from "drizzle-orm";
import { sendWAMessage, getWAState } from "./whatsapp.js";

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function randomDelayMs(minMs: number, maxMs: number): Promise<void> {
  return new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

async function getEffectiveDailyLimit(session: typeof waSessionsTable.$inferSelect): Promise<number> {
  if (!session.connectedAt) return session.dailyLimit;
  const msConnected = Date.now() - new Date(session.connectedAt).getTime();
  const daysConnected = Math.floor(msConnected / (1000 * 60 * 60 * 24));
  if (daysConnected < session.warmupDays) {
    return session.warmupDailyLimit;
  }
  return session.dailyLimit;
}

async function getTodaySendCount(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ c: count() })
    .from(waSendLogTable)
    .where(and(gte(waSendLogTable.sentAt, startOfDay), eq(waSendLogTable.status, "sent")));

  return Number(result?.c ?? 0);
}

export async function processScheduledMessages(): Promise<void> {
  const waState = getWAState();
  if (waState.status !== "connected") return;

  const [session] = await db.select().from(waSessionsTable).limit(1);
  if (!session || session.isPaused) return;

  const dailyLimit = await getEffectiveDailyLimit(session);
  const todayCount = await getTodaySendCount();

  if (todayCount >= dailyLimit) {
    return;
  }

  const remaining = dailyLimit - todayCount;
  const now = new Date();

  const dueLeads = await db
    .select({
      lead: waCampaignLeadsTable,
      sellerId: sellersTable.id,
      phone: sellersTable.phone,
      storeName: sellersTable.storeName,
    })
    .from(waCampaignLeadsTable)
    .innerJoin(sellersTable, eq(waCampaignLeadsTable.sellerId, sellersTable.id))
    .where(
      and(
        eq(waCampaignLeadsTable.status, "active"),
        lte(waCampaignLeadsTable.nextSendAt, now),
      ),
    )
    .limit(remaining);

  for (const { lead, phone, storeName } of dueLeads) {
    if (lead.currentDay >= 1 && !lead.repliedAt) {
      await db
        .update(waCampaignLeadsTable)
        .set({ status: "paused_no_reply" })
        .where(eq(waCampaignLeadsTable.id, lead.id));
      console.log(`[WA-CAMPAIGN] Lead ${lead.id} paused (no reply after Day ${lead.currentDay})`);
      continue;
    }

    const nextDayOffset = lead.currentDay + 1;

    const [step] = await db
      .select()
      .from(waSequenceStepsTable)
      .where(
        and(
          eq(waSequenceStepsTable.sequenceId, lead.sequenceId),
          eq(waSequenceStepsTable.dayOffset, nextDayOffset),
        ),
      )
      .limit(1);

    if (!step) {
      await db
        .update(waCampaignLeadsTable)
        .set({ status: "completed" })
        .where(eq(waCampaignLeadsTable.id, lead.id));
      continue;
    }

    const firstName = storeName ? storeName.split(" ")[0] : "there";
    const message = interpolate(step.message, {
      name: firstName,
      storeName: storeName ?? "your store",
      firstName,
    });

    const cleanPhone = phone.replace(/^\+/, "");

    await randomDelayMs(3000, 8000);

    let sendStatus: "sent" | "failed" = "sent";
    let errorMessage: string | undefined;

    try {
      await sendWAMessage(cleanPhone, message);
      console.log(`[WA-CAMPAIGN] Sent Day ${nextDayOffset} to ${cleanPhone}`);
    } catch (e: any) {
      sendStatus = "failed";
      errorMessage = e?.message ?? "Unknown error";
      console.error(`[WA-CAMPAIGN] Failed to send to ${cleanPhone}:`, e?.message);
    }

    await db.insert(waSendLogTable).values({
      toPhone: cleanPhone,
      campaignLeadId: lead.id,
      message,
      status: sendStatus,
      errorMessage: errorMessage ?? null,
    });

    if (sendStatus === "sent") {
      const jitterMs = Math.random() * 2 * 60 * 60 * 1000;
      const nextSendAt = new Date(Date.now() + 23 * 60 * 60 * 1000 + jitterMs);

      await db
        .update(waCampaignLeadsTable)
        .set({
          currentDay: nextDayOffset,
          lastSentAt: new Date(),
          nextSendAt,
        })
        .where(eq(waCampaignLeadsTable.id, lead.id));
    }
  }
}

export function startCampaignScheduler(): void {
  console.log("[WA-CAMPAIGN] Scheduler started (60s interval)");
  setInterval(async () => {
    try {
      await processScheduledMessages();
    } catch (e) {
      console.error("[WA-CAMPAIGN] Scheduler error:", e);
    }
  }, 60_000);
}
