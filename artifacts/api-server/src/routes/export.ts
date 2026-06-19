import { Router } from "express";
import { db } from "@workspace/db";
import {
  sellersTable,
  productsTable,
  productImagesTable,
  productVariantsTable,
  ordersTable,
  orderItemsTable,
} from "@workspace/db/schema";
import { eq, and, ne, asc, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getSellerPlan, getPlanLimits } from "../lib/planLimits.js";

const router = Router();

router.get("/export", requireAuth, async (req, res) => {
  try {
    const plan = await getSellerPlan(req.seller!.sellerId);
    if (!getPlanLimits(plan).exportEnabled) {
      res.status(403).json({
        error: "Store data export is available on the Pro plan. Upgrade to download your data.",
        upgradeRequired: true,
      });
      return;
    }

    const sellerId = req.seller!.sellerId;

    const [seller] = await db
      .select({
        id: sellersTable.id,
        storeName: sellersTable.storeName,
        subdomain: sellersTable.subdomain,
      })
      .from(sellersTable)
      .where(eq(sellersTable.id, sellerId))
      .limit(1);

    const products = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, sellerId), ne(productsTable.status, "deleted")))
      .orderBy(asc(productsTable.sortOrder));

    const productIds = products.map((p) => p.id);
    const [images, variants] = productIds.length > 0
      ? await Promise.all([
          db.select().from(productImagesTable).where(inArray(productImagesTable.productId, productIds)).orderBy(asc(productImagesTable.displayOrder)),
          db.select().from(productVariantsTable).where(inArray(productVariantsTable.productId, productIds)),
        ])
      : [[], []];

    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.sellerId, sellerId))
      .orderBy(desc(ordersTable.createdAt));

    const orderIds = orders.map((o) => o.id);
    const orderItems = orderIds.length > 0
      ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds))
      : [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      seller,
      products: products.map((p) => ({
        ...p,
        price: p.price != null ? parseFloat(p.price as unknown as string) : null,
        images: images.filter((i) => i.productId === p.id),
        variants: variants.filter((v) => v.productId === p.id),
      })),
      orders: orders.map((o) => ({
        ...o,
        totalAmount: parseFloat(o.totalAmount as unknown as string),
        items: orderItems
          .filter((i) => i.orderId === o.id)
          .map((i) => ({
            ...i,
            priceSnapshot: parseFloat(i.priceSnapshot as unknown as string),
          })),
      })),
    };

    const filename = `chatcart-export-${seller?.subdomain ?? sellerId}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export store data" });
  }
});

export default router;
