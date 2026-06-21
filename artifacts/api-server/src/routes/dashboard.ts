import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq, and, ne, count, sum, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireActiveSubscription } from "../lib/planLimits.js";

const router = Router();

router.get("/dashboard/stats", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const sellerId = req.seller!.sellerId;

    const [active] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, sellerId), eq(productsTable.status, "active")));

    const [oos] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, sellerId), eq(productsTable.status, "out_of_stock")));

    const [hidden] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, sellerId), eq(productsTable.status, "hidden")));

    const [totalProducts] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, sellerId), ne(productsTable.status, "deleted")));

    const [orderStats] = await db
      .select({ count: count(), total: sum(ordersTable.totalAmount) })
      .from(ordersTable)
      .where(eq(ordersTable.sellerId, sellerId));

    const [pendingOrders] = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(and(eq(ordersTable.sellerId, sellerId), eq(ordersTable.status, "pending")));

    const recentOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.sellerId, sellerId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5);

    const orderIds = recentOrders.map((o) => o.id);
    const itemCounts =
      orderIds.length > 0
        ? await db
            .select({ orderId: orderItemsTable.orderId, itemCount: count() })
            .from(orderItemsTable)
            .where(inArray(orderItemsTable.orderId, orderIds))
            .groupBy(orderItemsTable.orderId)
        : [];

    const itemCountMap: Record<string, number> = {};
    for (const ic of itemCounts) {
      itemCountMap[ic.orderId] = ic.itemCount;
    }

    res.json({
      totalProducts: totalProducts.count,
      activeProducts: active.count,
      outOfStockProducts: oos.count,
      hiddenProducts: hidden.count,
      totalOrders: orderStats.count,
      pendingOrders: pendingOrders.count,
      totalRevenue: parseFloat(orderStats.total ?? "0"),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        customerContact: o.customerContact,
        status: o.status,
        totalAmount: parseFloat(o.totalAmount as unknown as string),
        itemCount: itemCountMap[o.id] ?? 0,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
