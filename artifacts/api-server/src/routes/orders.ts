import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq, and, desc, count, inArray, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getSellerPlan, getPlanLimits } from "../lib/planLimits.js";

const router = Router();

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

router.get("/orders", requireAuth, async (req, res) => {
  try {
    const { status, page = "1", limit = "20" } = req.query as {
      status?: string;
      page?: string;
      limit?: string;
    };
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(ordersTable.sellerId, req.seller!.sellerId)];
    if (status) {
      conditions.push(
        eq(
          ordersTable.status,
          status as "pending" | "confirmed" | "fulfilled"
        )
      );
    }

    const plan = await getSellerPlan(req.seller!.sellerId);
    const limits = getPlanLimits(plan);
    if (limits.orderHistoryDays !== null) {
      const cutoff = new Date(Date.now() - limits.orderHistoryDays * 24 * 60 * 60 * 1000);
      conditions.push(gte(ordersTable.createdAt, cutoff));
    }

    const [totalRow] = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(and(...conditions));

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(desc(ordersTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const orderIds = orders.map((o) => o.id);
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
      orders: orders.map((o) => ({
        id: o.id,
        customerContact: o.customerContact,
        status: o.status,
        totalAmount: parseFloat(o.totalAmount as unknown as string),
        itemCount: itemCountMap[o.id] ?? 0,
        createdAt: o.createdAt,
      })),
      total: totalRow.count,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list orders" });
  }
});

router.get("/orders/:orderId", requireAuth, async (req, res) => {
  try {
    const orderId = String(req.params.orderId);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.id, orderId),
          eq(ordersTable.sellerId, req.seller!.sellerId)
        )
      )
      .limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, order.id));
    res.json({
      id: order.id,
      customerContact: order.customerContact,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount as unknown as string),
      itemCount: items.length,
      createdAt: order.createdAt,
      items: items.map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: parseFloat(item.priceSnapshot as unknown as string),
        variantSnapshot: item.variantSnapshot,
        quantity: item.quantity,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get order" });
  }
});

router.post("/orders", requireAuth, async (req, res) => {
  try {
    const body = req.body as {
      customerContact?: string;
      items: Array<{
        productNameSnapshot: string;
        priceSnapshot: string;
        variantSnapshot?: string;
        quantity?: number;
      }>;
    };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: "items required" });
      return;
    }

    const orderId = generateOrderId();
    const totalAmount = body.items
      .reduce(
        (sum, item) =>
          sum + parseFloat(item.priceSnapshot) * (item.quantity ?? 1),
        0
      )
      .toFixed(2);

    const [order] = await db
      .insert(ordersTable)
      .values({
        id: orderId,
        sellerId: req.seller!.sellerId,
        customerContact: body.customerContact,
        totalAmount,
      })
      .returning();

    const items = await db
      .insert(orderItemsTable)
      .values(
        body.items.map((item) => ({
          orderId,
          productNameSnapshot: item.productNameSnapshot,
          priceSnapshot: item.priceSnapshot,
          variantSnapshot: item.variantSnapshot,
          quantity: item.quantity ?? 1,
        }))
      )
      .returning();

    res.status(201).json({
      id: order.id,
      customerContact: order.customerContact,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount as unknown as string),
      itemCount: items.length,
      createdAt: order.createdAt,
      items: items.map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: parseFloat(item.priceSnapshot as unknown as string),
        variantSnapshot: item.variantSnapshot,
        quantity: item.quantity,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.patch("/orders/:orderId/status", requireAuth, async (req, res) => {
  try {
    const orderId = String(req.params.orderId);
    const { status } = req.body as {
      status: "pending" | "confirmed" | "fulfilled";
    };
    const [updated] = await db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(ordersTable.id, orderId),
          eq(ordersTable.sellerId, req.seller!.sellerId)
        )
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({
      id: updated.id,
      customerContact: updated.customerContact,
      status: updated.status,
      totalAmount: parseFloat(updated.totalAmount as unknown as string),
      itemCount: 0,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
