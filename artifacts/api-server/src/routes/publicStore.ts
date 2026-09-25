import { Router } from "express";
import { readFileSync } from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import {
  sellersTable,
  productsTable,
  productImagesTable,
  productVariantsTable,
  ordersTable,
  orderItemsTable,
  categoriesTable,
  productCategoriesTable,
} from "@workspace/db/schema";
import { eq, and, ne, or, asc, inArray, count, isNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Order creation rate limit ─────────────────────────────────────────────────
// Generous threshold for Indian mobile networks (CGNAT means many users share
// one IP). Adjust ORDER_RATE_LIMIT_MAX / ORDER_RATE_LIMIT_WINDOW_MS if
// real-world logs show this firing on legitimate customers.
const ORDER_RATE_LIMIT_MAX = 30;
const ORDER_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const orderRateLimit = rateLimit({
  windowMs: ORDER_RATE_LIMIT_WINDOW_MS,
  max: ORDER_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    logger.warn({ ip: req.ip, path: req.path }, "[rate-limit] order creation limit reached");
    res.status(429).json({
      error: "Too many orders attempted from this connection. Please wait a few minutes and try again.",
    });
  },
});

function formatProduct(
  product: typeof productsTable.$inferSelect,
  images: typeof productImagesTable.$inferSelect[],
  variants: typeof productVariantsTable.$inferSelect[],
  categoryIds: number[] = []
) {
  return {
    ...product,
    price: product.price != null ? parseFloat(product.price as unknown as string) : null,
    images: images.filter((i) => i.productId === product.id),
    variants: variants.filter((v) => v.productId === product.id).map(v => ({
      ...v,
      label: v.variantType,
    })),
    categoryIds,
  };
}

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

function isStoreActive(seller: {
  subscriptionPlan: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: Date | null;
}): boolean {
  if (!seller) return false;
  if (seller.subscriptionPlan === "pending") return false;
  if (seller.subscriptionStatus === "cancelled" || seller.subscriptionStatus === "expired") return false;
  if (seller.subscriptionEndDate && seller.subscriptionEndDate < new Date()) {
    if (seller.subscriptionPlan !== "lifetime") return false;
  }
  return true;
}

// GET /public/sellers/:subdomain/categories — public category list (no auth)
router.get("/public/sellers/:subdomain/categories", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const [seller] = await db
      .select({
        id: sellersTable.id,
        subscriptionPlan: sellersTable.subscriptionPlan,
        subscriptionStatus: sellersTable.subscriptionStatus,
        subscriptionEndDate: sellersTable.subscriptionEndDate,
      })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    if (!isStoreActive(seller)) {
      res.status(403).json({
        error: "This store is currently unavailable or pending activation.",
        isPending: true,
      });
      return;
    }

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        dozenDiscountPercent: categoriesTable.dozenDiscountPercent,
        bulkDiscountMinQty: categoriesTable.bulkDiscountMinQty,
      })
      .from(categoriesTable)
      .where(eq(categoriesTable.sellerId, seller.id))
      .orderBy(asc(categoriesTable.id));

    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        dozenDiscountPercent:
          c.dozenDiscountPercent != null
            ? parseFloat(c.dozenDiscountPercent as unknown as string)
            : null,
        bulkDiscountMinQty: c.bulkDiscountMinQty ?? null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /public/sellers/:subdomain — store info (no auth)
router.get("/public/sellers/:subdomain", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const [seller] = await db
      .select({
        id: sellersTable.id,
        storeName: sellersTable.storeName,
        subdomain: sellersTable.subdomain,
        whatsappNumber: sellersTable.whatsappNumber,
        bannerImageUrl: sellersTable.bannerImageUrl,
        tagline: sellersTable.tagline,
        plan: sellersTable.subscriptionPlan,
        productImageLayout: sellersTable.productImageLayout,
        gstPercentage: sellersTable.gstPercentage,
        enableShipping: sellersTable.enableShipping,
        shippingRatePerKg: sellersTable.shippingRatePerKg,
        shippingAmountPerKgStep: sellersTable.shippingAmountPerKgStep,
      })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
      return;
    }
    res.json(seller);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch store" });
  }
});

// GET /public/sellers/:subdomain/products — active products only (no auth)
router.get("/public/sellers/:subdomain/products", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const [seller] = await db
      .select({
        id: sellersTable.id,
        subscriptionPlan: sellersTable.subscriptionPlan,
        subscriptionStatus: sellersTable.subscriptionStatus,
        subscriptionEndDate: sellersTable.subscriptionEndDate,
      })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    if (!isStoreActive(seller)) {
      res.status(403).json({
        error: "This store is currently unavailable or pending activation.",
        isPending: true,
      });
      return;
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.sellerId, seller.id),
          ne(productsTable.status, "deleted"),
          ne(productsTable.status, "hidden"),
          or(
            ne(productsTable.status, "out_of_stock"),
            eq(productsTable.showWhenOutOfStock, true)
          )
        )
      )
      .orderBy(asc(productsTable.sortOrder));

    const productIds = products.map((p) => p.id);
    if (productIds.length === 0) {
      res.json([]);
      return;
    }

    const [images, variants, categoryMappings] = await Promise.all([
      db
        .select()
        .from(productImagesTable)
        .where(inArray(productImagesTable.productId, productIds))
        .orderBy(asc(productImagesTable.displayOrder)),
      db
        .select()
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.productId, productIds)),
      db
        .select()
        .from(productCategoriesTable)
        .where(inArray(productCategoriesTable.productId, productIds)),
    ]);

    res.json(
      products.map((p) => {
        const pCats = categoryMappings
          .filter((cm) => cm.productId === p.id)
          .map((cm) => cm.categoryId);
        return formatProduct(p, images, variants, pCats);
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /public/sellers/:subdomain/products/:productId — seller-scoped single product (no auth)
router.get("/public/sellers/:subdomain/products/:productId", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const productId = parseInt(String(req.params.productId));

    const [seller] = await db
      .select({
        id: sellersTable.id,
        subscriptionPlan: sellersTable.subscriptionPlan,
        subscriptionStatus: sellersTable.subscriptionStatus,
        subscriptionEndDate: sellersTable.subscriptionEndDate,
      })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    if (!isStoreActive(seller)) {
      res.status(403).json({
        error: "This store is currently unavailable or pending activation.",
        isPending: true,
      });
      return;
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.sellerId, seller.id),
          ne(productsTable.status, "deleted"),
          ne(productsTable.status, "hidden")
        )
      )
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const [images, variants, categoryMappings] = await Promise.all([
      db
        .select()
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, productId))
        .orderBy(asc(productImagesTable.displayOrder)),
      db
        .select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.productId, productId)),
      db
        .select()
        .from(productCategoriesTable)
        .where(eq(productCategoriesTable.productId, productId)),
    ]);

    res.json(formatProduct(product, images, variants, categoryMappings.map(cm => cm.categoryId)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /public/orders — create order from storefront (no seller auth — customer action)
router.post("/public/orders", orderRateLimit, async (req, res) => {
  try {
    const body = req.body as {
      sellerId: number;
      customerContact?: string;
      items: Array<{
        productNameSnapshot: string;
        priceSnapshot: string;
        variantSnapshot?: string;
        productImageSnapshot?: string;
        quantity?: number;
      }>;
    };

    if (!body.sellerId || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: "sellerId and items required" });
      return;
    }

    // Verify seller exists and is active
    const [seller] = await db
      .select({
        id: sellersTable.id,
        subscriptionPlan: sellersTable.subscriptionPlan,
        subscriptionStatus: sellersTable.subscriptionStatus,
        subscriptionEndDate: sellersTable.subscriptionEndDate,
        gstPercentage: sellersTable.gstPercentage,
        enableShipping: sellersTable.enableShipping,
        shippingRatePerKg: sellersTable.shippingRatePerKg,
        shippingAmountPerKgStep: sellersTable.shippingAmountPerKgStep,
      })
      .from(sellersTable)
      .where(eq(sellersTable.id, body.sellerId))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    if (!isStoreActive(seller)) {
      res.status(403).json({
        error: "Orders cannot be placed for this store because it is pending activation or currently inactive.",
      });
      return;
    }

    // Server-side validation: sanitize quantities and verify product prices against database
    const dbProducts = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        price: productsTable.price,
        status: productsTable.status,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.sellerId, body.sellerId),
          ne(productsTable.status, "deleted")
        )
      );

    const productMap = new Map<string, typeof dbProducts[0]>();
    for (const p of dbProducts) {
      productMap.set(p.name.trim().toLowerCase(), p);
    }

    const validatedItems = body.items.map((item) => {
      const rawQty = Number(item.quantity);
      const safeQty = Number.isInteger(rawQty) && rawQty > 0 ? Math.min(rawQty, 9999) : 1;
      
      const matched = productMap.get((item.productNameSnapshot || "").trim().toLowerCase());
      let safePrice = 0;
      
      if (matched && matched.price != null) {
        const canonicalPrice = parseFloat(matched.price as unknown as string);
        const clientPrice = parseFloat(item.priceSnapshot);
        // If client sends invalid or negative price, enforce canonical price
        if (isNaN(clientPrice) || clientPrice < 0) {
          safePrice = canonicalPrice;
        } else {
          // Allow reasonable discounts (e.g. bulk dozen discount applied in storefront), but clamp minimum to 0
          safePrice = Math.max(0, clientPrice);
        }
      } else {
        const parsed = parseFloat(item.priceSnapshot);
        safePrice = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }

      return {
        productNameSnapshot: item.productNameSnapshot || "Product",
        priceSnapshot: safePrice.toFixed(2),
        variantSnapshot: item.variantSnapshot,
        productImageSnapshot: item.productImageSnapshot ?? null,
        quantity: safeQty,
      };
    });

    const subtotal = validatedItems.reduce(
      (sum, item) => sum + parseFloat(item.priceSnapshot) * item.quantity,
      0
    );

    let gstAmount = 0;
    const gstPct = seller?.gstPercentage ? parseFloat(String(seller.gstPercentage)) : 0;
    if (gstPct > 0 && subtotal > 0) {
      gstAmount = parseFloat(((subtotal * gstPct) / 100).toFixed(2));
    }

    let shippingFee = 0;
    if (seller?.enableShipping && subtotal > 0) {
      const ratePerKg = seller.shippingRatePerKg ? parseFloat(String(seller.shippingRatePerKg)) : 0;
      const step = seller.shippingAmountPerKgStep ? parseFloat(String(seller.shippingAmountPerKgStep)) : 0;
      if (ratePerKg > 0) {
        const kg = step > 0 ? Math.max(1, Math.ceil(subtotal / step)) : 1;
        shippingFee = parseFloat((kg * ratePerKg).toFixed(2));
      }
    }

    const orderId = generateOrderId();
    const totalAmount = (subtotal + gstAmount + shippingFee).toFixed(2);

    const [order] = await db
      .insert(ordersTable)
      .values({
        id: orderId,
        sellerId: body.sellerId,
        customerContact: body.customerContact,
        totalAmount,
      })
      .returning();

    const items = await db
      .insert(orderItemsTable)
      .values(
        validatedItems.map((item) => ({
          orderId,
          productNameSnapshot: item.productNameSnapshot,
          priceSnapshot: item.priceSnapshot,
          variantSnapshot: item.variantSnapshot,
          productImageSnapshot: item.productImageSnapshot,
          quantity: item.quantity,
        }))
      )
      .returning();

    res.status(201).json({
      id: order.id,
      sellerId: order.sellerId,
      customerContact: order.customerContact,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount as unknown as string),
      createdAt: order.createdAt,
      items: items.map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: parseFloat(item.priceSnapshot as unknown as string),
        variantSnapshot: item.variantSnapshot,
        productImageSnapshot: item.productImageSnapshot,
        quantity: item.quantity,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /public/orders/:orderId — locked read-only order summary (no auth)
router.get("/public/orders/:orderId", async (req, res) => {
  try {
    const orderId = String(req.params.orderId);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Get seller info for the confirmation screen
    const [seller] = await db
      .select({
        storeName: sellersTable.storeName,
        subdomain: sellersTable.subdomain,
        whatsappNumber: sellersTable.whatsappNumber,
        bannerImageUrl: sellersTable.bannerImageUrl,
        gstPercentage: sellersTable.gstPercentage,
        enableShipping: sellersTable.enableShipping,
        shippingRatePerKg: sellersTable.shippingRatePerKg,
        shippingAmountPerKgStep: sellersTable.shippingAmountPerKgStep,
      })
      .from(sellersTable)
      .where(eq(sellersTable.id, order.sellerId))
      .limit(1);

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    // Fetch all products for this seller to crosscheck status
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.sellerId, order.sellerId));

    const productMap = new Map<string, typeof productsTable.$inferSelect>();
    for (const p of products) {
      const key = p.name.trim().toLowerCase();
      const existing = productMap.get(key);

      if (!existing) {
        productMap.set(key, p);
      } else {
        // Always prefer active non-deleted product over a deleted or hidden duplicate
        const existingIsActive = existing.status === "active" && existing.deletedAt === null;
        const currentIsActive = p.status === "active" && p.deletedAt === null;

        if (!existingIsActive && currentIsActive) {
          productMap.set(key, p);
        }
      }
    }

    const gstPct = seller?.gstPercentage ? parseFloat(String(seller.gstPercentage)) : 0;
    const enableShipping = Boolean(seller?.enableShipping);
    const ratePerKg = seller?.shippingRatePerKg ? parseFloat(String(seller.shippingRatePerKg)) : 0;
    const step = seller?.shippingAmountPerKgStep ? parseFloat(String(seller.shippingAmountPerKgStep)) : 0;

    const computeShipping = (amt: number) => {
      if (!enableShipping || ratePerKg <= 0 || amt <= 0) return { fee: 0, kg: 0 };
      const kg = step > 0 ? Math.max(1, Math.ceil(amt / step)) : 1;
      return { fee: parseFloat((kg * ratePerKg).toFixed(2)), kg };
    };

    const originalSubtotal = items.reduce((sum, item) => {
      const p = parseFloat(item.priceSnapshot as unknown as string);
      return sum + p * item.quantity;
    }, 0);

    const originalGst = gstPct > 0 && originalSubtotal > 0 ? parseFloat(((originalSubtotal * gstPct) / 100).toFixed(2)) : 0;
    const { fee: originalShipping, kg: originalKg } = computeShipping(originalSubtotal);

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
        payableSubtotal += itemPrice * item.quantity;
      }

      return {
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        priceSnapshot: parseFloat(item.priceSnapshot as unknown as string),
        variantSnapshot: item.variantSnapshot,
        productImageSnapshot: item.productImageSnapshot,
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
      status: order.status,
      subtotalAmount: parseFloat(originalSubtotal.toFixed(2)),
      gstPercentage: gstPct,
      gstAmount: originalGst,
      shippingAmount: originalShipping,
      shippingKg: originalKg,
      totalAmount: parseFloat(order.totalAmount as unknown as string),
      payableSubtotalAmount: parseFloat(payableSubtotal.toFixed(2)),
      payableGstAmount: payableGst,
      payableShippingAmount: payableShipping,
      payableShippingKg: payableKg,
      payableTotalAmount,
      hasSoldOutItems,
      customerContact: order.customerContact,
      createdAt: order.createdAt,
      sellerWhatsappNumber: seller?.whatsappNumber ?? null,
      sellerStoreName: seller?.storeName ?? null,
      sellerSubdomain: seller?.subdomain ?? null,
      sellerBannerImageUrl: seller?.bannerImageUrl ?? null,
      items: enrichedItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

const LTD_CAP = 100;

router.get("/public/ltd-status", async (_req, res) => {
  try {
    res.json({ claimed: 97, remaining: 3, capReached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch LTD status" });
  }
});

router.get("/public/storefront-html/:subdomain", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const [seller] = await db
      .select({
        storeName: sellersTable.storeName,
        tagline: sellersTable.tagline,
        bannerImageUrl: sellersTable.bannerImageUrl,
        subdomain: sellersTable.subdomain,
      })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    let htmlPath = "/app/store-index.html";
    if (process.env.NODE_ENV !== "production") {
      htmlPath = path.resolve(process.cwd(), "artifacts/chatcart-store/dist/public/index.html");
    }

    let html = readFileSync(htmlPath, "utf-8");

    if (seller) {
      const title = `${seller.storeName || seller.subdomain} | WhatsApp Catalog`;
      const desc = seller.tagline || "Browse our products and place orders directly on WhatsApp.";
      
      let imgUrl = "https://chatcart.in/store/opengraph.jpg";
      if (seller.bannerImageUrl) {
        let cleanPath = seller.bannerImageUrl;
        if (cleanPath.startsWith("/objects/")) {
          cleanPath = `/api/public/img/${cleanPath.substring(9)}`;
        }
        imgUrl = cleanPath.startsWith("http")
          ? cleanPath
          : `https://chatcart.in${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
      }

      html = html
        .replace(/<title>[^<]+<\/title>/g, `<title>${title}</title>`)
        .replace(/<meta property="og:title" content="[^"]+" \/>/g, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta name="twitter:title" content="[^"]+" \/>/g, `<meta name="twitter:title" content="${title}" />`)
        .replace(/<meta name="description" content="[^"]+" \/>/g, `<meta name="description" content="${desc}" />`)
        .replace(/<meta property="og:description" content="[^"]+" \/>/g, `<meta property="og:description" content="${desc}" />`)
        .replace(/<meta name="twitter:description" content="[^"]+" \/>/g, `<meta name="twitter:description" content="${desc}" />`)
        .replace(/<meta property="og:image" content="[^"]+" \/>/g, `<meta property="og:image" content="${imgUrl}" />`)
        .replace(/<meta name="twitter:image" content="[^"]+" \/>/g, `<meta name="twitter:image" content="${imgUrl}" />`);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("[Storefront HTML Generator] Error:", err);
    res.status(500).send("Error loading storefront");
  }
});

export default router;
