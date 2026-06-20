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
import { eq, and, ne, or, asc, inArray } from "drizzle-orm";

const router = Router();

function formatProduct(
  product: typeof productsTable.$inferSelect,
  images: typeof productImagesTable.$inferSelect[],
  variants: typeof productVariantsTable.$inferSelect[]
) {
  return {
    ...product,
    price: product.price != null ? parseFloat(product.price as unknown as string) : null,
    images: images.filter((i) => i.productId === product.id),
    variants: variants.filter((v) => v.productId === product.id),
  };
}

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

// GET /public/sellers/:subdomain/categories — public category list (no auth)
router.get("/public/sellers/:subdomain/categories", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const [seller] = await db
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        dozenDiscountPercent: categoriesTable.dozenDiscountPercent,
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
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
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

    const [images, variants] = await Promise.all([
      db
        .select()
        .from(productImagesTable)
        .where(inArray(productImagesTable.productId, productIds))
        .orderBy(asc(productImagesTable.displayOrder)),
      db
        .select()
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.productId, productIds)),
    ]);

    res.json(products.map((p) => formatProduct(p, images, variants)));
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
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(eq(sellersTable.subdomain, subdomain))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Store not found" });
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

    const [images, variants] = await Promise.all([
      db
        .select()
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, productId))
        .orderBy(asc(productImagesTable.displayOrder)),
      db
        .select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.productId, productId)),
    ]);

    res.json(formatProduct(product, images, variants));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /public/orders — create order from storefront (no seller auth — customer action)
router.post("/public/orders", async (req, res) => {
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

    // Verify seller exists
    const [seller] = await db
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(eq(sellersTable.id, body.sellerId))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    const orderId = generateOrderId();
    const totalAmount = body.items
      .reduce(
        (sum, item) => sum + parseFloat(item.priceSnapshot) * (item.quantity ?? 1),
        0
      )
      .toFixed(2);

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
        body.items.map((item) => ({
          orderId,
          productNameSnapshot: item.productNameSnapshot,
          priceSnapshot: item.priceSnapshot,
          variantSnapshot: item.variantSnapshot,
          productImageSnapshot: item.productImageSnapshot ?? null,
          quantity: item.quantity ?? 1,
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

    // Get seller WhatsApp number for the handoff link
    const [seller] = await db
      .select({
        storeName: sellersTable.storeName,
        subdomain: sellersTable.subdomain,
        whatsappNumber: sellersTable.whatsappNumber,
      })
      .from(sellersTable)
      .where(eq(sellersTable.id, order.sellerId))
      .limit(1);

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    res.json({
      id: order.id,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount as unknown as string),
      customerContact: order.customerContact,
      createdAt: order.createdAt,
      sellerWhatsappNumber: seller?.whatsappNumber ?? null,
      sellerStoreName: seller?.storeName ?? null,
      sellerSubdomain: seller?.subdomain ?? null,
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
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
