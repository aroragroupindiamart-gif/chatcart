import { Router } from "express";
import { db } from "@workspace/db";
import {
  sellersTable,
  productsTable,
  productImagesTable,
  productVariantsTable,
  ordersTable,
  orderItemsTable,
  categoriesTable,
} from "@workspace/db/schema";
import { eq, and, ne, asc, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireActiveSubscription } from "../lib/planLimits.js";
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
      .select({ id: sellersTable.id, storeName: sellersTable.storeName, subdomain: sellersTable.subdomain })
      .from(sellersTable)
      .where(eq(sellersTable.id, sellerId))
      .limit(1);

    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.sellerId, sellerId))
      .orderBy(asc(categoriesTable.name));

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
      categories: categories.map((c) => ({
        ...c,
        dozenDiscountPercent: c.dozenDiscountPercent != null ? parseFloat(c.dozenDiscountPercent as unknown as string) : null,
      })),
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

router.post("/import-json", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const plan = await getSellerPlan(req.seller!.sellerId);
    if (!getPlanLimits(plan).exportEnabled) {
      res.status(403).json({ error: "Import is available on the Pro plan.", upgradeRequired: true });
      return;
    }

    const { products: importProducts, categories: importCategories } = req.body ?? {};
    if (!Array.isArray(importProducts)) {
      res.status(400).json({ error: "Invalid file: missing products array" });
      return;
    }

    const sellerId = req.seller!.sellerId;

    const existingCats = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.sellerId, sellerId));
    const catByName = new Map(existingCats.map((c) => [c.name.toLowerCase(), c.id]));

    const catIdMap = new Map<number, number>();
    if (Array.isArray(importCategories)) {
      for (const cat of importCategories) {
        if (cat.id == null || !cat.name) continue;
        let existingId = catByName.get(String(cat.name).toLowerCase());
        if (existingId == null) {
          const [newCat] = await db
            .insert(categoriesTable)
            .values({
              sellerId,
              name: String(cat.name),
              dozenDiscountPercent: cat.dozenDiscountPercent != null ? String(cat.dozenDiscountPercent) : null,
              bulkDiscountMinQty: cat.bulkDiscountMinQty != null ? Number(cat.bulkDiscountMinQty) : null,
            })
            .returning({ id: categoriesTable.id });
          existingId = newCat.id;
          catByName.set(String(cat.name).toLowerCase(), existingId);
        }
        catIdMap.set(Number(cat.id), existingId);
      }
    }

    const existingProducts = await db
      .select({ name: productsTable.name, sku: productsTable.sku })
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, sellerId), ne(productsTable.status, "deleted")));

    const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));
    const existingSkus = new Set(existingProducts.filter((p) => p.sku).map((p) => p.sku!.toLowerCase()));

    let imported = 0;
    const duplicates: string[] = [];

    for (const p of importProducts) {
      if (!p.name) continue;

      const isDuplicate =
        (p.sku && existingSkus.has(String(p.sku).toLowerCase())) ||
        existingNames.has(String(p.name).toLowerCase());

      if (isDuplicate) {
        duplicates.push(p.name);
        continue;
      }

      const newCategoryId =
        p.categoryId != null ? (catIdMap.get(Number(p.categoryId)) ?? null) : null;

      const validStatuses = ["active", "out_of_stock", "hidden"];
      const [newProduct] = await db
        .insert(productsTable)
        .values({
          sellerId,
          name: String(p.name),
          sku: p.sku ? String(p.sku) : null,
          description: p.description ? String(p.description) : null,
          price: p.price != null ? String(p.price) : null,
          status: validStatuses.includes(p.status) ? p.status : "active",
          categoryId: newCategoryId,
          sortOrder: Number(p.sortOrder ?? 0),
          stockCount: p.stockCount != null ? Number(p.stockCount) : 1,
          showWhenOutOfStock: p.showWhenOutOfStock != null ? Boolean(p.showWhenOutOfStock) : false,
        })
        .returning({ id: productsTable.id });

      if (Array.isArray(p.images) && p.images.length > 0) {
        await db.insert(productImagesTable).values(
          p.images.map((img: { url: string; displayOrder?: number }, idx: number) => ({
            productId: newProduct.id,
            url: img.url,
            displayOrder: img.displayOrder ?? idx,
          }))
        );
      }

      if (Array.isArray(p.variants) && p.variants.length > 0) {
        await db.insert(productVariantsTable).values(
          p.variants.map((v: { variantType: string; options?: string[] }) => ({
            productId: newProduct.id,
            variantType: v.variantType,
            options: Array.isArray(v.options) ? v.options : [],
          }))
        );
      }

      imported++;
    }

    res.json({ imported, skipped: duplicates.length, duplicates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import store data" });
  }
});

export default router;
