import { db } from "@workspace/db";
import {
  waCampaignLeadsTable,
  waSequenceStepsTable,
  waSendLogTable,
  waSessionsTable,
  sellersTable,
  waInboundLeadsTable,
} from "@workspace/db/schema";
import { eq, and, count, gte, gt, asc, sql } from "drizzle-orm";
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
  if (todayCount >= dailyLimit) return;

  const remaining = dailyLimit - todayCount;

  // Capture cutoff once — leads that become due during this tick are handled next tick
  const now = new Date();

  // ── One-at-a-time claim loop ─────────────────────────────────────────────────
  // Each iteration claims exactly ONE lead with a 5-minute lease using
  // FOR UPDATE SKIP LOCKED. Two concurrent scheduler instances (dev + prod) can
  // never claim the same row: the inner SELECT locks the row and the second
  // instance skips it. Processing one lead takes <30s, well within the 5-min
  // lease, so the lease cannot expire mid-processing.
  // If the process crashes after claim but before updating next_send_at, the
  // 5-min lease expires naturally and the lead re-enters the queue automatically.
  for (let i = 0; i < remaining; i++) {
    const leaseExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const claimedResult = await db.execute(sql`
      UPDATE wa_campaign_leads
      SET next_send_at = ${leaseExpiry}
      WHERE id IN (
        SELECT id FROM wa_campaign_leads
        WHERE status = 'active' AND next_send_at <= ${now}
        ORDER BY next_send_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `);

    const claimedRows = claimedResult.rows as Array<{ id: string | number }>;
    if (claimedRows.length === 0) break; // No more due leads this tick

    const leadId = Number(claimedRows[0].id);

    // Fetch full data for the claimed lead
    const [leadData] = await db
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
      .where(eq(waCampaignLeadsTable.id, leadId));

    if (!leadData) continue;

    const { lead, sellerPhone, sellerStoreName, inboundPhone, inboundDisplayName } = leadData;

    try {
      // Resolve phone and display name — prefer seller FK, fall back to inbound lead
      const rawPhone = sellerPhone ?? inboundPhone ?? lead.phone ?? null;
      if (!rawPhone) {
        // No phone — skip this tick; lead will be re-claimed when lease expires
        console.warn(`[WA-CAMPAIGN] Lead ${lead.id} has no phone — skipping`);
        await db
          .update(waCampaignLeadsTable)
          .set({ nextSendAt: new Date(Date.now() + 60 * 60 * 1000) }) // retry in 1h
          .where(eq(waCampaignLeadsTable.id, lead.id));
        continue;
      }
      const cleanPhone = rawPhone.replace(/^\+/, "");
      const displayName = sellerStoreName ?? inboundDisplayName ?? "there";

      // Reply-gate: if at least one step has been sent, require a reply before continuing
      if (lead.currentHourOffset >= 0 && !lead.repliedAt) {
        await db
          .update(waCampaignLeadsTable)
          .set({ status: "paused_no_reply" })
          .where(eq(waCampaignLeadsTable.id, lead.id));
        console.log(`[WA-CAMPAIGN] Lead ${lead.id} paused (no reply after ${lead.currentHourOffset}h step)`);
        continue;
      }

      // Find the next step — supports non-consecutive hourOffsets
      const [step] = await db
        .select()
        .from(waSequenceStepsTable)
        .where(
          and(
            eq(waSequenceStepsTable.sequenceId, lead.sequenceId),
            gt(waSequenceStepsTable.hourOffset, lead.currentHourOffset),
          ),
        )
        .orderBy(asc(waSequenceStepsTable.hourOffset))
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
          console.log(`[WA-CAMPAIGN] Sent ${step.hourOffset}h step (${step.mediaType}) to ${cleanPhone}`);
        } else {
          await sendWAMessage(cleanPhone, message);
          console.log(`[WA-CAMPAIGN] Sent ${step.hourOffset}h step to ${cleanPhone}`);
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
        // Look ahead to find the next step so we can compute its anchor time
        const [nextStep] = await db
          .select({ hourOffset: waSequenceStepsTable.hourOffset })
          .from(waSequenceStepsTable)
          .where(
            and(
              eq(waSequenceStepsTable.sequenceId, lead.sequenceId),
              gt(waSequenceStepsTable.hourOffset, step.hourOffset),
            ),
          )
          .orderBy(asc(waSequenceStepsTable.hourOffset))
          .limit(1);

        // Anchor nextSendAt to enrolledAt (createdAt) + nextStep.hourOffset.
        // This prevents scheduler delays from compounding across steps.
        let nextSendAt: Date;
        if (nextStep) {
          const enrolledAt = new Date(lead.createdAt).getTime();
          nextSendAt = new Date(enrolledAt + nextStep.hourOffset * 60 * 60 * 1000);
        } else {
          // No next step — set far future; status will be completed on next poll
          nextSendAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }

        await db
          .update(waCampaignLeadsTable)
          .set({
            currentHourOffset: step.hourOffset,
            lastSentAt: new Date(),
            nextSendAt,
          })
          .where(eq(waCampaignLeadsTable.id, lead.id));
      } else {
        // Send failed — reset nextSendAt for retry on the next tick
        await db
          .update(waCampaignLeadsTable)
          .set({ nextSendAt: new Date(Date.now() + 5 * 60 * 1000) })
          .where(eq(waCampaignLeadsTable.id, lead.id));
      }
    } catch (e: any) {
      // Unexpected exception — reset nextSendAt so the lead is not stranded.
      // The 5-min lease already provides a safety net, but an explicit reset
      // gives a tighter retry window and a clear log trail.
      console.error(`[WA-CAMPAIGN] Unexpected error processing lead ${lead.id}:`, e?.message);
      try {
        await db
          .update(waCampaignLeadsTable)
          .set({ nextSendAt: new Date(Date.now() + 5 * 60 * 1000) })
          .where(eq(waCampaignLeadsTable.id, lead.id));
      } catch (resetErr: any) {
        console.error(`[WA-CAMPAIGN] Failed to reset nextSendAt for lead ${lead.id} (5-min lease will auto-expire):`, resetErr?.message);
      }
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
