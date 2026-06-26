import { db } from "@workspace/db";
import {
  waCampaignLeadsTable,
  waSequenceStepsTable,
  waSendLogTable,
  waSessionsTable,
  sellersTable,
  waInboundLeadsTable,
} from "@workspace/db/schema";
import { eq, and, lte, count, gte, gt, asc } from "drizzle-orm";
import { sendWAMessage, sendWAMediaMessage, getWAState } from "./whatsapp.js";

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

  // Fetch leads — join sellers OR inbound leads depending on which FK is set
  const dueLeads = await db
    .select({
      lead: waCampaignLeadsTable,
      sellerPhone: sellersTable.phone,
      sellerStoreName: sellersTable.storeName,
      inboundPhone: waInboundLeadsTable.phone,
      inboundDisplayName: waInboundLeadsTable.displayName,
    })
    .from(waCampaignLeadsTable)
    .leftJoin(sellersTable, eq(waCampaignLeadsTable.sellerId, sellersTable.id))
    .leftJoin(waInboundLeadsTable, eq(waCampaignLeadsTable.inboundLeadId, waInboundLeadsTable.id))
    .where(
      and(
        eq(waCampaignLeadsTable.status, "active"),
        lte(waCampaignLeadsTable.nextSendAt, now),
      ),
    )
    .limit(remaining);

  for (const { lead, sellerPhone, sellerStoreName, inboundPhone, inboundDisplayName } of dueLeads) {
    // Resolve phone and display name — prefer seller FK, fall back to inbound lead
    const rawPhone = sellerPhone ?? inboundPhone ?? lead.phone ?? null;
    if (!rawPhone) {
      console.warn(`[WA-CAMPAIGN] Lead ${lead.id} has no phone — skipping`);
      continue;
    }
    const cleanPhone = rawPhone.replace(/^\+/, "");
    const displayName = sellerStoreName ?? inboundDisplayName ?? "there";

    if (lead.currentDay >= 1 && !lead.repliedAt) {
      await db
        .update(waCampaignLeadsTable)
        .set({ status: "paused_no_reply" })
        .where(eq(waCampaignLeadsTable.id, lead.id));
      console.log(`[WA-CAMPAIGN] Lead ${lead.id} paused (no reply after Day ${lead.currentDay})`);
      continue;
    }

    // Find the next step after the lead's current position — supports non-consecutive dayOffsets
    const [step] = await db
      .select()
      .from(waSequenceStepsTable)
      .where(
        and(
          eq(waSequenceStepsTable.sequenceId, lead.sequenceId),
          gt(waSequenceStepsTable.dayOffset, lead.currentDay),
        ),
      )
      .orderBy(asc(waSequenceStepsTable.dayOffset))
      .limit(1);

    if (!step) {
      await db
        .update(waCampaignLeadsTable)
        .set({ status: "completed" })
        .where(eq(waCampaignLeadsTable.id, lead.id));
      continue;
    }

    const firstName = displayName.split(" ")[0];
    const message = interpolate(step.message, {
      name: firstName,
      storeName: displayName,
      firstName,
    });

    // Human-like delay before send (longer budget accommodates media upload time)
    await randomDelayMs(3000, 8000);

    let sendStatus: "sent" | "failed" = "sent";
    let errorMessage: string | undefined;

    try {
      if (step.mediaUrl && step.mediaType) {
        await sendWAMediaMessage(cleanPhone, step.mediaUrl, step.mediaType, message, step.mediaFilename ?? null);
        console.log(`[WA-CAMPAIGN] Sent Day ${step.dayOffset} (${step.mediaType}) to ${cleanPhone}`);
      } else {
        await sendWAMessage(cleanPhone, message);
        console.log(`[WA-CAMPAIGN] Sent Day ${step.dayOffset} to ${cleanPhone}`);
      }
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
          currentDay: step.dayOffset,
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
