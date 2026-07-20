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
  categoriesTable,
} from "@workspace/db/schema";
import { eq, desc, asc, and, gte, lte, ilike, or, count, sql, inArray } from "drizzle-orm";
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
    plan: z.enum(["pending", "starter", "growth", "pro", "lifetime"]).optional(),
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

router.post("/admin/sellers/bulk-activate", requireAdminAuth, async (req, res) => {
  const parsed = z.object({
    sellerIds: z.array(z.number().int().positive()).min(1),
    plan: z.enum(["starter", "growth", "pro", "lifetime"]),
    status: z.enum(["active", "trial"]).default("active"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const { sellerIds, plan, status } = parsed.data;
  await db
    .update(sellersTable)
    .set({ subscriptionPlan: plan as never, subscriptionStatus: status as never, subscriptionStartDate: new Date() })
    .where(inArray(sellersTable.id, sellerIds));

  await audit(req.admin!.adminId, "bulk_activate_sellers", req.ip ?? "unknown", {
    details: { sellerIds, plan, status, count: sellerIds.length },
  });

  res.json({ ok: true, updated: sellerIds.length });
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

  // Fetch itemsCount and format for each order
  const ordersWithDetails = await Promise.all(
    orders.map(async (item) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, item.order.id));

      let customerName = "Guest";
      let customerPhone = "-";
      if (item.order.customerContact) {
        const nameMatch = item.order.customerContact.match(/Name:\s*([^,]+)/i);
        const phoneMatch = item.order.customerContact.match(/Phone:\s*(.+)/i);
        customerName = nameMatch ? nameMatch[1].trim() : item.order.customerContact;
        customerPhone = phoneMatch ? phoneMatch[1].trim() : "-";
      }

      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

      return {
        order: {
          ...item.order,
          total: parseFloat(item.order.totalAmount),
          itemsCount,
          customerName,
          customerPhone,
        },
        storeName: item.storeName || "Unnamed Store",
        phone: item.phone,
      };
    })
  );

  await audit(req.admin!.adminId, "viewed_platform_orders", req.ip ?? "unknown");
  res.json(ordersWithDetails);
});

// ── Single order details ─────────────────────────────────────────────────────

router.get("/admin/orders/:id", requireAdminAuth, async (req, res) => {
  try {
    const orderId = req.params.id;

    const [row] = await db
      .select({
        order: ordersTable,
        storeName: sellersTable.storeName,
        phone: sellersTable.phone,
      })
      .from(ordersTable)
      .leftJoin(sellersTable, eq(ordersTable.sellerId, sellersTable.id))
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    let customerName = "Guest";
    let customerPhone = "-";
    if (row.order.customerContact) {
      const nameMatch = row.order.customerContact.match(/Name:\s*([^,]+)/i);
      const phoneMatch = row.order.customerContact.match(/Phone:\s*(.+)/i);
      customerName = nameMatch ? nameMatch[1].trim() : row.order.customerContact;
      customerPhone = phoneMatch ? phoneMatch[1].trim() : "-";
    }

    const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

    // Audit log specific order access
    await audit(req.admin!.adminId, "view_order", req.ip ?? "unknown", {
      targetOrderId: orderId,
      targetSellerId: row.order.sellerId,
    });

    res.json({
      ...row.order,
      total: parseFloat(row.order.totalAmount),
      itemsCount,
      customerName,
      customerPhone,
      storeName: row.storeName || "Unnamed Store",
      storePhone: row.phone,
      items: items.map((item) => ({
        ...item,
        priceSnapshot: parseFloat(item.priceSnapshot),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get order details" });
  }
});

// ── Seller-wise analytics ─────────────────────────────────────────────────────

router.get("/admin/sellers/:id/analytics", requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { range = "all" } = req.query as Record<string, string>;

    const [seller] = await db
      .select()
      .from(sellersTable)
      .where(eq(sellersTable.id, id))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    const now = new Date();
    let startDate: Date | null = null;
    if (range === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "year") {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const orderConditions = [eq(ordersTable.sellerId, id)];
    if (startDate) {
      orderConditions.push(gte(ordersTable.createdAt, startDate));
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...orderConditions))
      .orderBy(asc(ordersTable.createdAt));

    const orderIds = orders.map((o) => o.id);

    const items = orderIds.length > 0
      ? await db
          .select({
            orderId: orderItemsTable.orderId,
            productName: orderItemsTable.productNameSnapshot,
            price: orderItemsTable.priceSnapshot,
            quantity: orderItemsTable.quantity,
            image: orderItemsTable.productImageSnapshot,
            categoryName: categoriesTable.name,
            createdAt: orderItemsTable.createdAt,
          })
          .from(orderItemsTable)
          .leftJoin(productsTable, and(
            eq(orderItemsTable.productNameSnapshot, productsTable.name),
            eq(productsTable.sellerId, id)
          ))
          .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
          .where(inArray(orderItemsTable.orderId, orderIds))
      : [];

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
    const totalOrders = orders.length;

    const productMap = new Map<string, { name: string; image: string | null; quantity: number; revenue: number }>();
    for (const item of items) {
      const key = item.productName;
      const price = parseFloat(item.price as string);
      const rev = price * item.quantity;
      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.quantity += item.quantity;
        existing.revenue += rev;
      } else {
        productMap.set(key, {
          name: item.productName,
          image: item.image ?? null,
          quantity: item.quantity,
          revenue: rev,
        });
      }
    }
    const bestSellers = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const categoryMap = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const item of items) {
      const catName = item.categoryName || "Uncategorized";
      const price = parseFloat(item.price as string);
      const rev = price * item.quantity;
      if (categoryMap.has(catName)) {
        const existing = categoryMap.get(catName)!;
        existing.quantity += item.quantity;
        existing.revenue += rev;
      } else {
        categoryMap.set(catName, {
          name: catName,
          revenue: rev,
          quantity: item.quantity,
        });
      }
    }
    const categoryPerformance = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    const trendPlaceholder: { [key: string]: { date: string; revenue: number; orders: number } } = {};
    if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
    } else if (range === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
    } else if (range === "year") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
    } else if (range === "all") {
      let oldestDate = now;
      if (orders.length > 0) {
        oldestDate = orders[0].createdAt;
      }
      let current = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), 1);
      while (current <= now) {
        const label = current.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
        current.setMonth(current.getMonth() + 1);
      }
    }

    const getLabel = (date: Date) => {
      if (range === "week") {
        return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      } else if (range === "month") {
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      } else if (range === "year") {
        return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      } else {
        return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      }
    };

    for (const o of orders) {
      const label = getLabel(o.createdAt);
      const val = parseFloat(o.totalAmount);
      if (!trendPlaceholder[label]) {
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
      trendPlaceholder[label].revenue += val;
      trendPlaceholder[label].orders += 1;
    }

    const trends = Object.values(trendPlaceholder);

    await audit(req.admin!.adminId, "viewed_seller_analytics", req.ip ?? "unknown", {
      targetSellerId: id,
    });

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
      },
      bestSellers,
      categoryPerformance,
      trends,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get seller analytics" });
  }
});

// ── Platform-wide analytics ───────────────────────────────────────────────────

router.get("/admin/analytics/platform", requireAdminAuth, async (req, res) => {
  try {
    const { range = "month" } = req.query as Record<string, string>;

    const now = new Date();
    let startDate: Date | null = null;
    if (range === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "year") {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const sellers = await db.select().from(sellersTable);
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    const orderConditions = [];
    if (startDate) {
      orderConditions.push(gte(ordersTable.createdAt, startDate));
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(orderConditions.length > 0 ? and(...orderConditions) : undefined)
      .orderBy(asc(ordersTable.createdAt));

    const orderIds = orders.map((o) => o.id);

    const items = orderIds.length > 0
      ? await db
          .select({
            orderId: orderItemsTable.orderId,
            sellerId: ordersTable.sellerId,
            productName: orderItemsTable.productNameSnapshot,
            price: orderItemsTable.priceSnapshot,
            quantity: orderItemsTable.quantity,
            image: orderItemsTable.productImageSnapshot,
            categoryName: categoriesTable.name,
          })
          .from(orderItemsTable)
          .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
          .leftJoin(productsTable, and(
            eq(orderItemsTable.productNameSnapshot, productsTable.name),
            eq(productsTable.sellerId, ordersTable.sellerId)
          ))
          .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
          .where(inArray(orderItemsTable.orderId, orderIds))
      : [];

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
    const totalOrders = orders.length;

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    let revWeek = 0;
    let revMonth = 0;
    let revYear = 0;
    let revAll = 0;

    const allOrders = await db.select().from(ordersTable);
    for (const o of allOrders) {
      const val = parseFloat(o.totalAmount);
      revAll += val;
      if (o.createdAt >= oneWeekAgo) revWeek += val;
      if (o.createdAt >= oneMonthAgo) revMonth += val;
      if (o.createdAt >= oneYearAgo) revYear += val;
    }

    const sellerStatsMap = new Map<number, { sellerId: number; storeName: string; phone: string; subdomain: string | null; revenue: number; ordersCount: number }>();
    for (const o of orders) {
      const sId = o.sellerId;
      const val = parseFloat(o.totalAmount);
      const sellerInfo = sellerMap.get(sId);
      if (!sellerInfo) continue;

      if (sellerStatsMap.has(sId)) {
        const existing = sellerStatsMap.get(sId)!;
        existing.revenue += val;
        existing.ordersCount += 1;
      } else {
        sellerStatsMap.set(sId, {
          sellerId: sId,
          storeName: sellerInfo.storeName || "Unnamed Store",
          phone: sellerInfo.phone,
          subdomain: sellerInfo.subdomain,
          revenue: val,
          ordersCount: 1,
        });
      }
    }
    const topSellers = Array.from(sellerStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const productMap = new Map<string, { name: string; image: string | null; quantity: number; revenue: number }>();
    for (const item of items) {
      const key = item.productName;
      const price = parseFloat(item.price as string);
      const rev = price * item.quantity;
      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.quantity += item.quantity;
        existing.revenue += rev;
      } else {
        productMap.set(key, {
          name: item.productName,
          image: item.image ?? null,
          quantity: item.quantity,
          revenue: rev,
        });
      }
    }
    const bestSellers = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const categoryMap = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const item of items) {
      const catName = item.categoryName || "Uncategorized";
      const price = parseFloat(item.price as string);
      const rev = price * item.quantity;
      if (categoryMap.has(catName)) {
        const existing = categoryMap.get(catName)!;
        existing.quantity += item.quantity;
        existing.revenue += rev;
      } else {
        categoryMap.set(catName, {
          name: catName,
          revenue: rev,
          quantity: item.quantity,
        });
      }
    }
    const categoryPerformance = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    const trendPlaceholder: { [key: string]: { date: string; revenue: number; orders: number } } = {};
    if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
    } else if (range === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
    } else if (range === "year") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
    } else if (range === "all") {
      let oldestDate = now;
      if (orders.length > 0) {
        oldestDate = orders[0].createdAt;
      }
      let current = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), 1);
      while (current <= now) {
        const label = current.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
        current.setMonth(current.getMonth() + 1);
      }
    }

    const getLabel = (date: Date) => {
      if (range === "week") {
        return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      } else if (range === "month") {
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      } else if (range === "year") {
        return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      } else {
        return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      }
    };

    for (const o of orders) {
      const label = getLabel(o.createdAt);
      const val = parseFloat(o.totalAmount);
      if (!trendPlaceholder[label]) {
        trendPlaceholder[label] = { date: label, revenue: 0, orders: 0 };
      }
      trendPlaceholder[label].revenue += val;
      trendPlaceholder[label].orders += 1;
    }

    const trends = Object.values(trendPlaceholder);

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        totalSellers: sellers.length,
      },
      breakdowns: {
        week: revWeek,
        month: revMonth,
        year: revYear,
        all: revAll,
      },
      topSellers,
      bestSellers,
      categoryPerformance,
      trends,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get platform analytics" });
  }
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
  const [lifetimeSellers] = await db.select({ c: count() }).from(sellersTable).where(eq(sellersTable.subscriptionPlan, "lifetime" as never));

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
      lifetimeCount: Number(lifetimeSellers?.c ?? 0),
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
