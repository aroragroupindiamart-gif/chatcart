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

function normalizeBraces(str: string): string {
  return str.replace(/[\uFF5B\u2774]/g, "{").replace(/[\uFF5D\u2775]/g, "}");
}

function interpolate(template: string, vars: Record<string, string>): string {
  return normalizeBraces(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = vars[key] ?? vars[key.toLowerCase()];
    return val !== undefined ? val : `{{${key}}}`;
  });
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

  // ── Recovery guard ────────────────────────────────────────────────────────────
  // Detect and fix any active lead whose next_send_at is more than 30 days beyond
  // its correct anchor (created_at + nextStep.hourOffset). This prevents leads from
  // being permanently stranded if a bug ever sets a far-future sentinel.
  await db.execute(sql`
    UPDATE wa_campaign_leads wcl
    SET next_send_at = wcl.created_at + (
      SELECT INTERVAL '1 hour' * wss.hour_offset
      FROM wa_sequence_steps wss
      WHERE wss.sequence_id = wcl.sequence_id
        AND wss.hour_offset > wcl.current_hour_offset
      ORDER BY wss.hour_offset ASC
      LIMIT 1
    )
    WHERE wcl.status = 'active'
      AND wcl.next_send_at > NOW() + INTERVAL '30 days'
      AND EXISTS (
        SELECT 1 FROM wa_sequence_steps wss2
        WHERE wss2.sequence_id = wcl.sequence_id
          AND wss2.hour_offset > wcl.current_hour_offset
      )
  `);

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

        if (nextStep) {
          // Anchor nextSendAt to enrolledAt (createdAt) + nextStep.hourOffset.
          // This prevents scheduler delays from compounding across steps.
          const enrolledAt = new Date(lead.createdAt).getTime();
          const nextSendAt = new Date(enrolledAt + nextStep.hourOffset * 60 * 60 * 1000);
          await db
            .update(waCampaignLeadsTable)
            .set({
              currentHourOffset: step.hourOffset,
              lastSentAt: new Date(),
              nextSendAt,
              sendFailureCount: 0,
            })
            .where(eq(waCampaignLeadsTable.id, lead.id));
        } else {
          // No next step — last step was just sent; mark completed immediately.
          // Never use a far-future sentinel here: the scheduler only claims leads
          // with next_send_at <= now, so a far-future date would strand the lead.
          await db
            .update(waCampaignLeadsTable)
            .set({
              currentHourOffset: step.hourOffset,
              lastSentAt: new Date(),
              status: "completed",
              sendFailureCount: 0,
            })
            .where(eq(waCampaignLeadsTable.id, lead.id));
          console.log(`[WA-CAMPAIGN] Lead ${lead.id} completed — all sequence steps sent`);
        }
      } else {
        // Send failed — distinguish transient connection errors from real message failures.
        // "WhatsApp disconnected" means the socket dropped mid-send; retry quickly (60s)
        // without counting it as a failure. Real failures (spam block, invalid number, etc.)
        // count toward the 3-strike limit and use a 10-min backoff.
        const isConnectionError =
          errorMessage?.includes("disconnected") ||
          errorMessage?.includes("connection") ||
          errorMessage?.includes("not connected") ||
          errorMessage?.includes("timed out");
        if (isConnectionError) {
          await db
            .update(waCampaignLeadsTable)
            .set({ nextSendAt: new Date(Date.now() + 60_000) })
            .where(eq(waCampaignLeadsTable.id, lead.id));
          console.log(`[WA-CAMPAIGN] Lead ${lead.id} connection error — retry in 60s`);
        } else {
          const newFailCount = (lead.sendFailureCount ?? 0) + 1;
          if (newFailCount >= 3) {
            await db
              .update(waCampaignLeadsTable)
              .set({ status: "send_failed", sendFailureCount: newFailCount, nextSendAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
              .where(eq(waCampaignLeadsTable.id, lead.id));
            console.warn(`[WA-CAMPAIGN] Lead ${lead.id} marked send_failed after ${newFailCount} consecutive failures`);
          } else {
            await db
              .update(waCampaignLeadsTable)
              .set({ sendFailureCount: newFailCount, nextSendAt: new Date(Date.now() + 10 * 60 * 1000) })
              .where(eq(waCampaignLeadsTable.id, lead.id));
          }
        }
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
