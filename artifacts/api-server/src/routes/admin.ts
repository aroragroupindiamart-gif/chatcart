import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminUsers,
  adminAuditLog,
  sellersTable,
  productsTable,
  ordersTable,
  orderItemsTable,
  contactSubmissions,
} from "@workspace/db/schema";
import { eq, desc, and, gte, lte, ilike, or, count, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signAdminToken, requireAdminAuth, type AdminJwtPayload } from "../middleware/adminAuth.js";
import { z } from "zod";

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

// ── Audit helper ──────────────────────────────────────────────────────────────

async function audit(
  adminId: number,
  action: string,
  ip: string,
  opts: { targetSellerId?: number; targetOrderId?: string; details?: unknown } = {},
) {
  await db.insert(adminAuditLog).values({
    adminUserId: adminId,
    action,
    ipAddress: ip,
    targetSellerId: opts.targetSellerId ?? null,
    targetOrderId: opts.targetOrderId ?? null,
    details: opts.details ?? null,
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post("/admin/auth/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const { email, password } = parsed.data;
  const ip = req.ip ?? "unknown";

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase())).limit(1);
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (admin.loginLockedUntil && admin.loginLockedUntil > new Date()) {
    res.status(429).json({ error: "Account locked due to too many failed attempts. Try again later." });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    const newAttempts = (admin.loginAttempts ?? 0) + 1;
    const lockedUntil = newAttempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOGIN_LOCKOUT_MS) : null;
    await db.update(adminUsers).set({ loginAttempts: newAttempts, loginLockedUntil: lockedUntil }).where(eq(adminUsers.id, admin.id));
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(adminUsers).set({ loginAttempts: 0, loginLockedUntil: null, lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
  await audit(admin.id, "admin_login", ip);

  const token = signAdminToken({ adminId: admin.id, email: admin.email, role: admin.role });
  res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
});

router.get("/admin/auth/me", requireAdminAuth, (req, res) => {
  res.json(req.admin);
});

router.post("/admin/auth/logout", requireAdminAuth, async (req, res) => {
  const ip = req.ip ?? "unknown";
  await audit(req.admin!.adminId, "admin_logout", ip);
  res.json({ success: true });
});

// ── Sellers ───────────────────────────────────────────────────────────────────

router.get("/admin/sellers", requireAdminAuth, async (req, res) => {
  const { q, status, plan } = req.query as Record<string, string>;

  let query = db.select().from(sellersTable).$dynamic();

  const conditions = [];
  if (q) conditions.push(or(ilike(sellersTable.storeName, `%${q}%`), ilike(sellersTable.phone, `%${q}%`)));
  if (status) conditions.push(eq(sellersTable.subscriptionStatus, status as never));
  if (plan) conditions.push(eq(sellersTable.subscriptionPlan, plan as never));

  if (conditions.length > 0) query = query.where(and(...conditions));

  const sellers = await query.orderBy(desc(sellersTable.createdAt));

  const withCounts = await Promise.all(
    sellers.map(async (s) => {
      const [pc] = await db.select({ c: count() }).from(productsTable).where(eq(productsTable.sellerId, s.id));
      const [oc] = await db.select({ c: count() }).from(ordersTable).where(eq(ordersTable.sellerId, s.id));
      return { ...s, productCount: Number(pc?.c ?? 0), orderCount: Number(oc?.c ?? 0) };
    }),
  );

  res.json(withCounts);
});

router.get("/admin/sellers/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, id)).limit(1);
  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }
  await audit(req.admin!.adminId, "viewed_seller", req.ip ?? "unknown", { targetSellerId: id });
  res.json(seller);
});

router.patch("/admin/sellers/:id/subscription", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = z.object({
    plan: z.enum(["pending", "starter", "growth", "pro"]).optional(),
    status: z.enum(["active", "trial", "expired", "cancelled", "suspended"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const update: Record<string, unknown> = {};
  if (parsed.data.plan) update.subscriptionPlan = parsed.data.plan;
  if (parsed.data.status) update.subscriptionStatus = parsed.data.status;
  if (parsed.data.startDate) update.subscriptionStartDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate) update.subscriptionEndDate = new Date(parsed.data.endDate);

  const [updated] = await db.update(sellersTable).set(update as never).where(eq(sellersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Seller not found" }); return; }

  await audit(req.admin!.adminId, "updated_subscription", req.ip ?? "unknown", {
    targetSellerId: id,
    details: { changes: parsed.data },
  });
  res.json(updated);
});

router.post("/admin/sellers/:id/suspend", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = z.object({ reason: z.string().min(5) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "reason is required (min 5 chars)" }); return; }

  const [updated] = await db
    .update(sellersTable)
    .set({ isSuspended: true, suspensionReason: parsed.data.reason, suspendedAt: new Date() })
    .where(eq(sellersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Seller not found" }); return; }

  await audit(req.admin!.adminId, "suspended_seller", req.ip ?? "unknown", {
    targetSellerId: id,
    details: { reason: parsed.data.reason },
  });
  res.json(updated);
});

router.post("/admin/sellers/:id/reactivate", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(sellersTable)
    .set({ isSuspended: false, suspensionReason: null, suspendedAt: null })
    .where(eq(sellersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Seller not found" }); return; }

  await audit(req.admin!.adminId, "reactivated_seller", req.ip ?? "unknown", { targetSellerId: id });
  res.json(updated);
});

// ── Seller drill-down ─────────────────────────────────────────────────────────

router.get("/admin/sellers/:id/products", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const products = await db.select().from(productsTable).where(eq(productsTable.sellerId, id)).orderBy(productsTable.sortOrder);
  await audit(req.admin!.adminId, "viewed_seller_products", req.ip ?? "unknown", { targetSellerId: id });
  res.json(products);
});

router.get("/admin/sellers/:id/orders", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.sellerId, id))
    .orderBy(desc(ordersTable.createdAt));

  const withItems = await Promise.all(
    orders.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      return { ...o, items };
    }),
  );

  await audit(req.admin!.adminId, "viewed_seller_orders", req.ip ?? "unknown", {
    targetSellerId: id,
    details: { orderCount: withItems.length },
  });
  res.json(withItems);
});

// ── Platform-wide orders ──────────────────────────────────────────────────────

router.get("/admin/orders", requireAdminAuth, async (req, res) => {
  const { sellerId, status, from, to, page = "1", limit = "50" } = req.query as Record<string, string>;

  const conditions = [];
  if (sellerId) conditions.push(eq(ordersTable.sellerId, Number(sellerId)));
  if (status) conditions.push(eq(ordersTable.status, status as never));
  if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(ordersTable.createdAt, new Date(to)));

  const offset = (Number(page) - 1) * Number(limit);

  let q = db.select({
    order: ordersTable,
    storeName: sellersTable.storeName,
    phone: sellersTable.phone,
  })
    .from(ordersTable)
    .leftJoin(sellersTable, eq(ordersTable.sellerId, sellersTable.id))
    .$dynamic();

  if (conditions.length > 0) q = q.where(and(...conditions));

  const orders = await q.orderBy(desc(ordersTable.createdAt)).limit(Number(limit)).offset(offset);

  await audit(req.admin!.adminId, "viewed_platform_orders", req.ip ?? "unknown");
  res.json(orders);
});

// ── Platform health ───────────────────────────────────────────────────────────

router.get("/admin/health", requireAdminAuth, async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalSellers] = await db.select({ c: count() }).from(sellersTable);
  const [activeSellers] = await db.select({ c: count() }).from(sellersTable).where(eq(sellersTable.subscriptionStatus, "active"));
  const [trialSellers] = await db.select({ c: count() }).from(sellersTable).where(eq(sellersTable.subscriptionStatus, "trial"));
  const [suspendedSellers] = await db.select({ c: count() }).from(sellersTable).where(eq(sellersTable.isSuspended, true));

  const [ordersToday] = await db.select({ c: count() }).from(ordersTable).where(gte(ordersTable.createdAt, todayStart));
  const [ordersWeek] = await db.select({ c: count() }).from(ordersTable).where(gte(ordersTable.createdAt, weekStart));
  const [ordersMonth] = await db.select({ c: count() }).from(ordersTable).where(gte(ordersTable.createdAt, monthStart));

  const signupTrend = await db
    .select({
      date: sql<string>`date_trunc('day', ${sellersTable.createdAt})::date`,
      count: count(),
    })
    .from(sellersTable)
    .where(gte(sellersTable.createdAt, weekStart))
    .groupBy(sql`date_trunc('day', ${sellersTable.createdAt})::date`)
    .orderBy(sql`date_trunc('day', ${sellersTable.createdAt})::date`);

  res.json({
    sellers: {
      total: Number(totalSellers?.c ?? 0),
      active: Number(activeSellers?.c ?? 0),
      trial: Number(trialSellers?.c ?? 0),
      suspended: Number(suspendedSellers?.c ?? 0),
    },
    orders: {
      today: Number(ordersToday?.c ?? 0),
      thisWeek: Number(ordersWeek?.c ?? 0),
      thisMonth: Number(ordersMonth?.c ?? 0),
    },
    signupTrend,
  });
});

// ── Audit log ─────────────────────────────────────────────────────────────────

router.get("/admin/audit-log", requireAdminAuth, async (req, res) => {
  const { action, targetSellerId, page = "1", limit = "50" } = req.query as Record<string, string>;

  const conditions = [];
  if (action) conditions.push(ilike(adminAuditLog.action, `%${action}%`));
  if (targetSellerId) conditions.push(eq(adminAuditLog.targetSellerId, Number(targetSellerId)));

  const offset = (Number(page) - 1) * Number(limit);

  let q = db.select({
    log: adminAuditLog,
    adminEmail: adminUsers.email,
  })
    .from(adminAuditLog)
    .leftJoin(adminUsers, eq(adminAuditLog.adminUserId, adminUsers.id))
    .$dynamic();

  if (conditions.length > 0) q = q.where(and(...conditions));

  const logs = await q.orderBy(desc(adminAuditLog.createdAt)).limit(Number(limit)).offset(offset);
  res.json(logs);
});

// ── Contact submissions ───────────────────────────────────────────────────────

router.get("/admin/contact-submissions", requireAdminAuth, async (req, res) => {
  const submissions = await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(100);
  res.json(submissions);
});

export default router;
