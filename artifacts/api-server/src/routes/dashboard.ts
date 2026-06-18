import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, ordersTable } from "@workspace/db/schema";
import { eq, and, ne, count, sum } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sellerId;

    const [productStats] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.sellerId, sellerId),
          ne(productsTable.status, "deleted")
        )
      );

    const [orderStats] = await db
      .select({ count: count(), total: sum(ordersTable.totalAmount) })
      .from(ordersTable)
      .where(eq(ordersTable.sellerId, sellerId));

    const [pendingOrders] = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.sellerId, sellerId),
          eq(ordersTable.status, "pending")
        )
      );

    res.json({
      stats: {
        totalProducts: productStats.count,
        totalOrders: orderStats.count,
        pendingOrders: pendingOrders.count,
        totalRevenue: orderStats.total ?? "0",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
