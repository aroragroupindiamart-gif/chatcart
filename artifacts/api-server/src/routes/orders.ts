import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, sellersTable, productsTable } from "@workspace/db/schema";
import { eq, and, desc, count, inArray, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getSellerPlan, getPlanLimits, requireActiveSubscription } from "../lib/planLimits.js";

const router = Router();

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

router.get("/orders", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const { status, page = "1", limit = "20", startDate, endDate } = req.query as {
      status?: string;
      page?: string;
      limit?: string;
      startDate?: string;
      endDate?: string;
    };
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 500);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(ordersTable.sellerId, req.seller!.sellerId)];
    if (status && status !== "all") {
      conditions.push(
        eq(
          ordersTable.status,
          status as "pending" | "confirmed" | "fulfilled"
        )
      );
    }

    if (startDate) {
      const parsedStart = new Date(startDate.includes("T") ? startDate : `${startDate}T00:00:00.000`);
      if (!isNaN(parsedStart.getTime())) {
        conditions.push(gte(ordersTable.createdAt, parsedStart));
      }
    }

    if (endDate) {
      const parsedEnd = new Date(endDate.includes("T") ? endDate : `${endDate}T23:59:59.999`);
      if (!isNaN(parsedEnd.getTime())) {
        conditions.push(lte(ordersTable.createdAt, parsedEnd));
      }
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
      totalPages: Math.ceil(totalRow.count / limitNum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list orders" });
  }
});

router.get("/orders/:orderId", requireAuth, requireActiveSubscription, async (req, res) => {
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
    const [items, [seller]] = await Promise.all([
      db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id)),
      db
        .select({
          enableGst: sellersTable.enableGst,
          gstPercentage: sellersTable.gstPercentage,
          enableShipping: sellersTable.enableShipping,
          shippingRatePerKg: sellersTable.shippingRatePerKg,
          shippingAmountPerKgStep: sellersTable.shippingAmountPerKgStep,
          parentSellerId: sellersTable.parentSellerId,
        })
        .from(sellersTable)
        .where(eq(sellersTable.id, req.seller!.sellerId))
        .limit(1),
    ]);

    const targetCatalogSellerId = seller?.parentSellerId ?? req.seller!.sellerId;

    // Fetch all products for this seller (or parent seller if child store) to crosscheck status
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.sellerId, targetCatalogSellerId));

    const productMap = new Map<string, typeof productsTable.$inferSelect>();
    for (const p of products) {
      const key = p.name.trim().toLowerCase();
      const existing = productMap.get(key);

      if (!existing) {
        productMap.set(key, p);
      } else {
        const existingIsActive = existing.status === "active" && existing.deletedAt === null;
        const currentIsActive = p.status === "active" && p.deletedAt === null;

        if (!existingIsActive && currentIsActive) {
          productMap.set(key, p);
        }
      }
    }

    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.priceSnapshot as unknown as string) * (item.quantity ?? 1),
      0
    );

    const gstPct = (seller?.enableGst && seller?.gstPercentage != null) ? parseFloat(seller.gstPercentage) : 0;
    const originalGst = gstPct > 0 ? (subtotal * gstPct) / 100 : 0;

    const enableShipping = Boolean(seller?.enableShipping);
    const ratePerKg = seller?.shippingRatePerKg != null ? parseFloat(seller.shippingRatePerKg) : 0;
    const stepAmount = seller?.shippingAmountPerKgStep != null ? parseFloat(seller.shippingAmountPerKgStep) : 0;

    const computeShipping = (amt: number) => {
      if (!enableShipping || ratePerKg <= 0 || amt <= 0) return { fee: 0, kg: 0 };
      const kg = stepAmount > 0 ? Math.max(1, Math.ceil(amt / stepAmount)) : 1;
      return { fee: parseFloat((kg * ratePerKg).toFixed(2)), kg };
    };

    const { fee: originalShipping, kg: originalKg } = computeShipping(subtotal);

    let payableSubtotal = 0;
    let hasSoldOutItems = false;

    const enrichedItems = items.map((item) => {
      const matchedProduct = productMap.get(item.productNameSnapshot.trim().toLowerCase());

      let isSoldOut = false;
      let soldOutReason: string | null = null;

      if (!matchedProduct) {
        isSoldOut = true;
        soldOutReason = "No longer available";
      } else if (matchedProduct.deletedAt !== null || matchedProduct.status === "deleted") {
        isSoldOut = true;
        soldOutReason = "Deleted";
      } else if (matchedProduct.status === "hidden") {
        isSoldOut = true;
        soldOutReason = "Hidden";
      } else if (matchedProduct.status === "out_of_stock") {
        isSoldOut = true;
        soldOutReason = "Out of stock";
      }

      if (isSoldOut) {
        hasSoldOutItems = true;
      } else {
        const itemPrice = parseFloat(item.priceSnapshot as unknown as string);
        payableSubtotal += itemPrice * (item.quantity ?? 1);
      }

      return {
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: parseFloat(item.priceSnapshot as unknown as string),
        variantSnapshot: item.variantSnapshot,
        productImageSnapshot: item.productImageSnapshot ?? null,
        quantity: item.quantity,
        isSoldOut,
        soldOutReason,
      };
    });

    const payableGst = gstPct > 0 && payableSubtotal > 0 ? parseFloat(((payableSubtotal * gstPct) / 100).toFixed(2)) : 0;
    const { fee: payableShipping, kg: payableKg } = computeShipping(payableSubtotal);
    const payableTotalAmount = payableSubtotal > 0 ? parseFloat((payableSubtotal + payableGst + payableShipping).toFixed(2)) : 0;

    res.json({
      id: order.id,
      customerContact: order.customerContact,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount as unknown as string),
      subtotalAmount: parseFloat(subtotal.toFixed(2)),
      gstPercentage: gstPct,
      gstAmount: parseFloat(originalGst.toFixed(2)),
      shippingAmount: originalShipping,
      shippingKg: originalKg,
      payableSubtotalAmount: parseFloat(payableSubtotal.toFixed(2)),
      payableGstAmount: payableGst,
      payableShippingAmount: payableShipping,
      payableShippingKg: payableKg,
      payableTotalAmount,
      hasSoldOutItems,
      itemCount: items.length,
      createdAt: order.createdAt,
      items: enrichedItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get order" });
  }
});

router.post("/orders", requireAuth, requireActiveSubscription, async (req, res) => {
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

router.patch("/orders/:orderId/status", requireAuth, requireActiveSubscription, async (req, res) => {
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
