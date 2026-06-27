import { Router } from "express";
import { requireAdminAuth, verifyAdminToken } from "../middleware/adminAuth.js";
import { db } from "@workspace/db";
import {
  waSessionsTable,
  waSequencesTable,
  waSequenceStepsTable,
  waCampaignLeadsTable,
  waSendLogTable,
  waInboundLeadsTable,
  waInboundMessagesTable,
  sellersTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte, count, isNotNull, inArray, or, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  connectWA,
  disconnectWA,
  getWAState,
  addSSEClient,
  removeSSEClient,
  getOrCreateSession,
} from "../lib/whatsapp.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { purgeStaleSessionFiles } from "../lib/waAuthState.js";

const router = Router();

// ── Status ─────────────────────────────────────────────────────────────────────

router.get("/admin/wa/status", requireAdminAuth, async (req, res) => {
  try {
    const session = await getOrCreateSession();
    const waState = getWAState();
    res.json({ ...waState, settings: session });
  } catch (e) {
    res.status(500).json({ error: "Failed to get status" });
  }
});

// ── SSE stream — EventSource cannot set headers, so we accept token via query ──

router.get("/admin/wa/stream", async (req, res) => {
  const token = (req.query.token as string) || req.headers.authorization?.slice(7) || "";
  try {
    verifyAdminToken(token);
  } catch {
    res.status(401).end("Unauthorized");
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  addSSEClient(res as any);

  const keepAlive = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeSSEClient(res as any);
  });
});

// ── Connection ────────────────────────────────────────────────────────────────

router.post("/admin/wa/connect", requireAdminAuth, async (req, res) => {
  try {
    connectWA();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to start connection" });
  }
});

router.post("/admin/wa/disconnect", requireAdminAuth, async (req, res) => {
  try {
    await disconnectWA();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// ── Settings ───────────────────────────────────────────────────────────────────

router.patch("/admin/wa/settings", requireAdminAuth, async (req, res) => {
  const schema = z.object({
    dailyLimit: z.number().int().min(1).max(1000).optional(),
    warmupDailyLimit: z.number().int().min(1).max(500).optional(),
    warmupDays: z.number().int().min(1).max(90).optional(),
    replyRateThreshold: z.number().int().min(0).max(100).optional(),
    isPaused: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid settings" });
    return;
  }
  try {
    const session = await getOrCreateSession();
    await db
      .update(waSessionsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(waSessionsTable.id, session.id));
    const [updated] = await db.select().from(waSessionsTable).where(eq(waSessionsTable.id, session.id));
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ── Sequences ─────────────────────────────────────────────────────────────────

router.get("/admin/wa/sequences", requireAdminAuth, async (req, res) => {
  try {
    const sequences = await db.select().from(waSequencesTable).orderBy(desc(waSequencesTable.createdAt));
    const result = await Promise.all(
      sequences.map(async (seq) => {
        const steps = await db
          .select()
          .from(waSequenceStepsTable)
          .where(eq(waSequenceStepsTable.sequenceId, seq.id))
          .orderBy(waSequenceStepsTable.hourOffset);
        const [leadCount] = await db
          .select({ c: count() })
          .from(waCampaignLeadsTable)
          .where(eq(waCampaignLeadsTable.sequenceId, seq.id));
        return { ...seq, steps, leadCount: Number(leadCount?.c ?? 0) };
      }),
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch sequences" });
  }
});

router.post("/admin/wa/sequences", requireAdminAuth, async (req, res) => {
  const stepSchema = z.object({
    hourOffset: z.number().int().min(0),
    message: z.string().min(1),
    mediaUrl: z.string().nullable().optional(),
    mediaType: z.enum(["image", "video", "document"]).nullable().optional(),
    mediaFilename: z.string().nullable().optional(),
  });
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    steps: z.array(stepSchema).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
    return;
  }
  // Validate ascending hour-offsets with no duplicates
  const offsets = parsed.data.steps.map((s) => s.hourOffset);
  for (let i = 1; i < offsets.length; i++) {
    if (offsets[i] <= offsets[i - 1]) {
      res.status(400).json({ error: `Hour offsets must be strictly ascending. ${offsets[i]}h comes after ${offsets[i - 1]}h.` });
      return;
    }
  }
  try {
    const [sequence] = await db
      .insert(waSequencesTable)
      .values({ name: parsed.data.name, description: parsed.data.description ?? null })
      .returning();
    await db.insert(waSequenceStepsTable).values(
      parsed.data.steps.map((s) => ({
        sequenceId: sequence.id,
        hourOffset: s.hourOffset,
        message: s.message,
        mediaUrl: s.mediaUrl ?? null,
        mediaType: s.mediaType ?? null,
        mediaFilename: s.mediaFilename ?? null,
      })),
    );
    const steps = await db
      .select()
      .from(waSequenceStepsTable)
      .where(eq(waSequenceStepsTable.sequenceId, sequence.id))
      .orderBy(waSequenceStepsTable.hourOffset);
    res.json({ ...sequence, steps });
  } catch (e) {
    res.status(500).json({ error: "Failed to create sequence" });
  }
});

// ── Media Upload ───────────────────────────────────────────────────────────────

router.post("/admin/wa/media/request-upload-url", requireAdminAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    size: z.number().int().positive(),
    contentType: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const { name, size, contentType } = parsed.data;
  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");

  const MAX_IMAGE = 5 * 1024 * 1024;
  const MAX_VIDEO_OR_DOC = 100 * 1024 * 1024;

  if (isImage && size > MAX_IMAGE) {
    res.status(400).json({ error: `Image too large — maximum 5 MB.` }); return;
  }
  if (!isImage && size > MAX_VIDEO_OR_DOC) {
    res.status(400).json({ error: `File too large — maximum 100 MB.` }); return;
  }

  try {
    const storageService = new ObjectStorageService();
    const uploadURL = await storageService.getObjectEntityUploadURL();
    const objectPath = storageService.normalizeObjectEntityPath(uploadURL);

    // Determine effective media type (large videos are sent as documents)
    const VIDEO_INLINE_LIMIT = 16 * 1024 * 1024;
    let mediaType: "image" | "video" | "document";
    if (isImage) mediaType = "image";
    else if (isVideo && size <= VIDEO_INLINE_LIMIT) mediaType = "video";
    else mediaType = "document";

    const sizeWarning = isVideo && size > VIDEO_INLINE_LIMIT && size <= MAX_VIDEO_OR_DOC
      ? `Video is larger than 16 MB — it will be sent as a downloadable document rather than an inline video.`
      : null;

    res.json({ uploadURL, objectPath, mediaType, sizeWarning, filename: name });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.delete("/admin/wa/sequences/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.delete(waSequencesTable).where(eq(waSequencesTable.id, id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete sequence" });
  }
});

// ── Pending sellers (audience pool) ───────────────────────────────────────────

router.get("/admin/wa/pending-sellers", requireAdminAuth, async (req, res) => {
  try {
    const sellers = await db
      .select({
        id: sellersTable.id,
        storeName: sellersTable.storeName,
        phone: sellersTable.phone,
        subdomain: sellersTable.subdomain,
        createdAt: sellersTable.createdAt,
      })
      .from(sellersTable)
      .where(eq(sellersTable.subscriptionPlan, "pending" as any))
      .orderBy(desc(sellersTable.createdAt));
    res.json(sellers);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch pending sellers" });
  }
});

// ── Campaign Leads ────────────────────────────────────────────────────────────

router.get("/admin/wa/leads", requireAdminAuth, async (req, res) => {
  try {
    const sellerIdParam = req.query.sellerId as string | undefined;
    const filterSellerId = sellerIdParam ? parseInt(sellerIdParam) : undefined;
    const where = filterSellerId ? eq(waCampaignLeadsTable.sellerId, filterSellerId) : undefined;

    const leads = await db
      .select({
        id: waCampaignLeadsTable.id,
        sequenceId: waCampaignLeadsTable.sequenceId,
        sequenceName: waSequencesTable.name,
        sellerId: waCampaignLeadsTable.sellerId,
        inboundLeadId: waCampaignLeadsTable.inboundLeadId,
        storeName: sellersTable.storeName,
        inboundDisplayName: waInboundLeadsTable.displayName,
        inboundPhone: waInboundLeadsTable.phone,
        phone: sellersTable.phone,
        currentHourOffset: waCampaignLeadsTable.currentHourOffset,
        nextSendAt: waCampaignLeadsTable.nextSendAt,
        lastSentAt: waCampaignLeadsTable.lastSentAt,
        repliedAt: waCampaignLeadsTable.repliedAt,
        status: waCampaignLeadsTable.status,
        sendFailureCount: waCampaignLeadsTable.sendFailureCount,
        createdAt: waCampaignLeadsTable.createdAt,
      })
      .from(waCampaignLeadsTable)
      .leftJoin(sellersTable, eq(waCampaignLeadsTable.sellerId, sellersTable.id))
      .leftJoin(waInboundLeadsTable, eq(waCampaignLeadsTable.inboundLeadId, waInboundLeadsTable.id))
      .innerJoin(waSequencesTable, eq(waCampaignLeadsTable.sequenceId, waSequencesTable.id))
      .where(where)
      .orderBy(desc(waCampaignLeadsTable.createdAt));
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.post("/admin/wa/leads", requireAdminAuth, async (req, res) => {
  const schema = z.object({
    sequenceId: z.number().int().positive(),
    sellerIds: z.array(z.number().int().positive()).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  try {
    const { sequenceId, sellerIds } = parsed.data;
    const [seq] = await db.select({ id: waSequencesTable.id }).from(waSequencesTable).where(eq(waSequencesTable.id, sequenceId)).limit(1);
    if (!seq) { res.status(404).json({ error: "Sequence not found" }); return; }

    // Verify all sellerIds actually correspond to pending sellers (server-side enforcement)
    const validPendingSellers = await db
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(and(inArray(sellersTable.id, sellerIds), eq(sellersTable.subscriptionPlan, "pending" as any)));
    const validIds = validPendingSellers.map((s) => s.id);
    if (validIds.length === 0) { res.status(400).json({ error: "No pending sellers found in the provided IDs" }); return; }

    const existing = await db
      .select({ sellerId: waCampaignLeadsTable.sellerId })
      .from(waCampaignLeadsTable)
      .where(and(eq(waCampaignLeadsTable.sequenceId, sequenceId), inArray(waCampaignLeadsTable.sellerId, validIds)));
    const existingIds = new Set(existing.map((e) => e.sellerId));
    const newSellerIds = validIds.filter((id) => !existingIds.has(id));

    if (newSellerIds.length === 0) { res.status(400).json({ error: "All selected sellers are already in this sequence" }); return; }

    await db.insert(waCampaignLeadsTable).values(
      newSellerIds.map((sellerId) => ({ sequenceId, sellerId, currentHourOffset: -1, nextSendAt: new Date(), status: "active" })),
    );
    res.json({ ok: true, added: newSellerIds.length, skipped: sellerIds.length - newSellerIds.length });
  } catch (e) {
    res.status(500).json({ error: "Failed to enroll leads" });
  }
});

router.post("/admin/wa/leads/bulk", requireAdminAuth, async (req, res) => {
  const schema = z.object({
    ids: z.array(z.number()).min(1),
    action: z.enum(["pause", "resume", "retry"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const { ids, action } = parsed.data;
  try {
    let updateData: Record<string, unknown>;
    if (action === "pause") {
      updateData = { status: "paused_manual" };
    } else if (action === "resume") {
      updateData = { status: "active", sendFailureCount: 0, nextSendAt: new Date() };
    } else {
      updateData = { status: "active", sendFailureCount: 0, nextSendAt: new Date() };
    }
    await db
      .update(waCampaignLeadsTable)
      .set(updateData as never)
      .where(sql`id = ANY(${ids})`);
    res.json({ updated: ids.length });
  } catch (e) {
    res.status(500).json({ error: "Bulk update failed" });
  }
});

router.patch("/admin/wa/leads/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ status: z.enum(["active", "paused_manual", "removed"]).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
  try {
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "active") {
      updateData.sendFailureCount = 0;
      updateData.nextSendAt = new Date();
    }
    const [updated] = await db.update(waCampaignLeadsTable).set(updateData as never).where(eq(waCampaignLeadsTable.id, id)).returning();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

// ── Inbound Leads ─────────────────────────────────────────────────────────────

router.get("/admin/wa/inbound-leads", requireAdminAuth, async (req, res) => {
  try {
    const leads = await db
      .select({
        id: waInboundLeadsTable.id,
        phone: waInboundLeadsTable.phone,
        displayName: waInboundLeadsTable.displayName,
        firstMessage: waInboundLeadsTable.firstMessage,
        lastMessage: waInboundLeadsTable.lastMessage,
        lastMessageAt: waInboundLeadsTable.lastMessageAt,
        messageCount: waInboundLeadsTable.messageCount,
        isWarm: waInboundLeadsTable.isWarm,
        matchedSellerId: waInboundLeadsTable.matchedSellerId,
        matchedSellerName: sellersTable.storeName,
        matchedSellerPlan: sellersTable.subscriptionPlan,
        createdAt: waInboundLeadsTable.createdAt,
      })
      .from(waInboundLeadsTable)
      .leftJoin(sellersTable, eq(waInboundLeadsTable.matchedSellerId, sellersTable.id))
      .orderBy(desc(waInboundLeadsTable.lastMessageAt));
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch inbound leads" });
  }
});

router.get("/admin/wa/inbound-leads/:id/messages", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const messages = await db
      .select()
      .from(waInboundMessagesTable)
      .where(eq(waInboundMessagesTable.inboundLeadId, id))
      .orderBy(waInboundMessagesTable.receivedAt);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/admin/wa/inbound-leads/bulk-enroll", requireAdminAuth, async (req, res) => {
  const schema = z.object({
    ids: z.array(z.number()).min(1),
    sequenceId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const { ids, sequenceId } = parsed.data;
  try {
    const [seq] = await db
      .select({ id: waSequencesTable.id })
      .from(waSequencesTable)
      .where(eq(waSequencesTable.id, sequenceId))
      .limit(1);
    if (!seq) { res.status(404).json({ error: "Sequence not found" }); return; }

    const inboundLeads = await db
      .select()
      .from(waInboundLeadsTable)
      .where(sql`id = ANY(${ids})`);

    let enrolled = 0;
    let skipped = 0;

    for (const lead of inboundLeads) {
      const existingChecks: any[] = [eq(waCampaignLeadsTable.inboundLeadId, lead.id)];
      if (lead.matchedSellerId) {
        existingChecks.push(eq(waCampaignLeadsTable.sellerId, lead.matchedSellerId));
      }
      const [existing] = await db
        .select({ id: waCampaignLeadsTable.id })
        .from(waCampaignLeadsTable)
        .where(and(eq(waCampaignLeadsTable.sequenceId, sequenceId), or(...existingChecks)))
        .limit(1);

      if (existing) { skipped++; continue; }

      await db.insert(waCampaignLeadsTable).values({
        sequenceId,
        sellerId: lead.matchedSellerId ?? null,
        inboundLeadId: lead.id,
        phone: lead.matchedSellerId ? null : lead.phone,
        currentHourOffset: -1,
        nextSendAt: new Date(),
        status: "active",
      });
      enrolled++;
    }

    res.json({ enrolled, skipped });
  } catch (e) {
    res.status(500).json({ error: "Bulk enroll failed" });
  }
});

router.post("/admin/wa/inbound-leads/:id/enroll", requireAdminAuth, async (req, res) => {
  const inboundLeadId = Number(req.params.id);
  const schema = z.object({ sequenceId: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }

  try {
    const [inboundLead] = await db
      .select()
      .from(waInboundLeadsTable)
      .where(eq(waInboundLeadsTable.id, inboundLeadId))
      .limit(1);
    if (!inboundLead) { res.status(404).json({ error: "Lead not found" }); return; }

    const [seq] = await db
      .select({ id: waSequencesTable.id })
      .from(waSequencesTable)
      .where(eq(waSequencesTable.id, parsed.data.sequenceId))
      .limit(1);
    if (!seq) { res.status(404).json({ error: "Sequence not found" }); return; }

    // Check if already enrolled via inbound lead OR matched seller
    const existingChecks: any[] = [eq(waCampaignLeadsTable.inboundLeadId, inboundLeadId)];
    if (inboundLead.matchedSellerId) {
      existingChecks.push(eq(waCampaignLeadsTable.sellerId, inboundLead.matchedSellerId));
    }

    const [existing] = await db
      .select({ id: waCampaignLeadsTable.id })
      .from(waCampaignLeadsTable)
      .where(and(
        eq(waCampaignLeadsTable.sequenceId, parsed.data.sequenceId),
        or(...existingChecks),
      ))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Already enrolled in this sequence" });
      return;
    }

    // If matched seller, enroll via sellerId; otherwise use inboundLeadId + phone
    const [enrolled] = await db
      .insert(waCampaignLeadsTable)
      .values({
        sequenceId: parsed.data.sequenceId,
        sellerId: inboundLead.matchedSellerId ?? null,
        inboundLeadId: inboundLead.id,
        phone: inboundLead.matchedSellerId ? null : inboundLead.phone,
        currentHourOffset: -1,
        nextSendAt: new Date(),
        status: "active",
      })
      .returning();

    res.json({ ok: true, campaignLeadId: enrolled.id });
  } catch (e) {
    res.status(500).json({ error: "Failed to enroll lead" });
  }
});

router.delete("/admin/wa/inbound-leads/bulk", requireAdminAuth, async (req, res) => {
  const schema = z.object({ ids: z.array(z.number()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
  try {
    // Nullify FK references in campaign leads before deleting
    await db.update(waCampaignLeadsTable)
      .set({ inboundLeadId: null })
      .where(inArray(waCampaignLeadsTable.inboundLeadId, parsed.data.ids));
    await db.delete(waInboundLeadsTable).where(inArray(waInboundLeadsTable.id, parsed.data.ids));
    res.json({ deleted: parsed.data.ids.length });
  } catch (e) {
    res.status(500).json({ error: "Bulk delete failed" });
  }
});

router.delete("/admin/wa/inbound-leads/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    // Nullify FK references in campaign leads before deleting
    await db.update(waCampaignLeadsTable)
      .set({ inboundLeadId: null })
      .where(eq(waCampaignLeadsTable.inboundLeadId, id));
    await db.delete(waInboundLeadsTable).where(eq(waInboundLeadsTable.id, id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ── Health metrics ─────────────────────────────────────────────────────────────

router.get("/admin/wa/health", requireAdminAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);

    const [[sentToday], [sentWeek], [failedToday], [repliedLeads], [activeLeads], [pausedLeads], [completedLeads], [inboundTotal], [sendFailedLeads]] =
      await Promise.all([
        db.select({ c: count() }).from(waSendLogTable).where(and(gte(waSendLogTable.sentAt, startOfDay), eq(waSendLogTable.status, "sent"))),
        db.select({ c: count() }).from(waSendLogTable).where(and(gte(waSendLogTable.sentAt, startOfWeek), eq(waSendLogTable.status, "sent"))),
        db.select({ c: count() }).from(waSendLogTable).where(and(gte(waSendLogTable.sentAt, startOfDay), eq(waSendLogTable.status, "failed"))),
        db.select({ c: count() }).from(waCampaignLeadsTable).where(isNotNull(waCampaignLeadsTable.repliedAt)),
        db.select({ c: count() }).from(waCampaignLeadsTable).where(eq(waCampaignLeadsTable.status, "active")),
        db.select({ c: count() }).from(waCampaignLeadsTable).where(eq(waCampaignLeadsTable.status, "paused_no_reply")),
        db.select({ c: count() }).from(waCampaignLeadsTable).where(eq(waCampaignLeadsTable.status, "completed")),
        db.select({ c: count() }).from(waInboundLeadsTable),
        db.select({ c: count() }).from(waCampaignLeadsTable).where(eq(waCampaignLeadsTable.status, "send_failed")),
      ]);

    const totalWeekSent = Number(sentWeek?.c ?? 0);
    const totalReplied = Number(repliedLeads?.c ?? 0);
    const replyRate = totalWeekSent > 0 ? Math.round((totalReplied / totalWeekSent) * 100) : null;
    const session = await getOrCreateSession();

    res.json({
      sentToday: Number(sentToday?.c ?? 0),
      sentThisWeek: totalWeekSent,
      failedToday: Number(failedToday?.c ?? 0),
      replyRate,
      activeLeads: Number(activeLeads?.c ?? 0),
      pausedLeads: Number(pausedLeads?.c ?? 0),
      completedLeads: Number(completedLeads?.c ?? 0),
      sendFailedLeads: Number(sendFailedLeads?.c ?? 0),
      inboundTotal: Number(inboundTotal?.c ?? 0),
      dailyLimit: session.dailyLimit,
      warmupDailyLimit: session.warmupDailyLimit,
      warmupDays: session.warmupDays,
      isPaused: session.isPaused,
      replyRateThreshold: session.replyRateThreshold,
      connectedAt: session.connectedAt,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch health metrics" });
  }
});

// ── Purge stale session files ──────────────────────────────────────────────────

router.post("/admin/wa/purge-stale-files", requireAdminAuth, async (req, res) => {
  try {
    const deleted = await purgeStaleSessionFiles();
    res.json({ ok: true, deleted });
  } catch (e) {
    res.status(500).json({ error: "Failed to purge files" });
  }
});

// ── Send log ───────────────────────────────────────────────────────────────────

router.get("/admin/wa/send-log", requireAdminAuth, async (req, res) => {
  try {
    const logs = await db
      .select({
        id: waSendLogTable.id,
        toPhone: waSendLogTable.toPhone,
        message: waSendLogTable.message,
        status: waSendLogTable.status,
        errorMessage: waSendLogTable.errorMessage,
        sentAt: waSendLogTable.sentAt,
        storeName: sellersTable.storeName,
      })
      .from(waSendLogTable)
      .leftJoin(waCampaignLeadsTable, eq(waSendLogTable.campaignLeadId, waCampaignLeadsTable.id))
      .leftJoin(sellersTable, eq(waCampaignLeadsTable.sellerId, sellersTable.id))
      .orderBy(desc(waSendLogTable.sentAt))
      .limit(100);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch send log" });
  }
});

export default router;
