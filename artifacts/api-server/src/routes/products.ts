import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productImagesTable,
  productVariantsTable,
} from "@workspace/db/schema";
import { eq, and, ne, asc, desc, ilike, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function formatProduct(product: typeof productsTable.$inferSelect, images: typeof productImagesTable.$inferSelect[], variants: typeof productVariantsTable.$inferSelect[]) {
  return {
    ...product,
    price: product.price != null ? parseFloat(product.price as unknown as string) : null,
    images: images.filter((i) => i.productId === product.id),
    variants: variants.filter((v) => v.productId === product.id),
  };
}

async function assertProductBelongsToSeller(productId: number, sellerId: number): Promise<boolean> {
  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.sellerId, sellerId)))
    .limit(1);
  return !!product;
}

// ── List & create ────────────────────────────────────────────────────────────

router.get("/products", requireAuth, async (req, res) => {
  try {
    const { categoryId, status, search } = req.query as {
      categoryId?: string;
      status?: string;
      search?: string;
    };
    const conditions = [
      eq(productsTable.sellerId, req.seller!.sellerId),
      ne(productsTable.status, "deleted"),
    ];
    if (categoryId) {
      conditions.push(eq(productsTable.categoryId, parseInt(categoryId)));
    }
    if (status) {
      conditions.push(eq(productsTable.status, status as "active" | "out_of_stock" | "hidden"));
    }
    if (search?.trim()) {
      conditions.push(ilike(productsTable.name, `%${search.trim()}%`));
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(asc(productsTable.sortOrder), desc(productsTable.createdAt));

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
    res.status(500).json({ error: "Failed to list products" });
  }
});

router.post("/products", requireAuth, async (req, res) => {
  try {
    const body = req.body as {
      name: string;
      description?: string;
      price: number;
      categoryId?: number;
      status?: "active" | "out_of_stock" | "hidden";
      stockCount?: number;
      showWhenOutOfStock?: boolean;
    };
    if (!body.name?.trim()) {
      res.status(400).json({ error: "Product name required" });
      return;
    }
    const [product] = await db
      .insert(productsTable)
      .values({
        sellerId: req.seller!.sellerId,
        name: body.name.trim(),
        description: body.description,
        price: body.price != null ? String(body.price) : null,
        categoryId: body.categoryId ?? null,
        status: body.status ?? "active",
        stockCount: body.stockCount ?? 1,
        showWhenOutOfStock: body.showWhenOutOfStock ?? false,
      })
      .returning();
    res.status(201).json(formatProduct(product, [], []));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ── Reorder (MUST come before /:productId to avoid route shadowing) ──────────

router.patch("/products/reorder", requireAuth, async (req, res) => {
  try {
    const { items } = req.body as { items: Array<{ id: number; sortOrder: number }> };
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items array required" });
      return;
    }
    await Promise.all(
      items.map((item) =>
        db
          .update(productsTable)
          .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
          .where(
            and(
              eq(productsTable.id, item.id),
              eq(productsTable.sellerId, req.seller!.sellerId)
            )
          )
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder products" });
  }
});

// ── Single product CRUD ──────────────────────────────────────────────────────

router.get("/products/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(String(req.params.productId));
    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.sellerId, req.seller!.sellerId),
          ne(productsTable.status, "deleted")
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
    res.status(500).json({ error: "Failed to get product" });
  }
});

router.patch("/products/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(String(req.params.productId));
    const body = req.body as {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: number | null;
      status?: "active" | "out_of_stock" | "hidden";
      stockCount?: number;
      showWhenOutOfStock?: boolean;
      sortOrder?: number;
    };

    const updates: Partial<typeof productsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = String(body.price);
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.status !== undefined) updates.status = body.status;
    if (body.stockCount !== undefined) updates.stockCount = body.stockCount;
    if (body.showWhenOutOfStock !== undefined)
      updates.showWhenOutOfStock = body.showWhenOutOfStock;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(productsTable)
      .set(updates)
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.sellerId, req.seller!.sellerId)
        )
      )
      .returning();
    if (!updated) {
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
    res.json(formatProduct(updated, images, variants));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(String(req.params.productId));
    const affected = await db
      .update(productsTable)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.sellerId, req.seller!.sellerId)
        )
      )
      .returning();
    if (!affected.length) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ── Product images ───────────────────────────────────────────────────────────

router.post("/products/:productId/images", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(String(req.params.productId));
    if (!(await assertProductBelongsToSeller(productId, req.seller!.sellerId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { url, displayOrder } = req.body as {
      url: string;
      displayOrder?: number;
    };
    if (!url) {
      res.status(400).json({ error: "Image URL required" });
      return;
    }
    const [image] = await db
      .insert(productImagesTable)
      .values({ productId, url, displayOrder: displayOrder ?? 0 })
      .returning();
    res.status(201).json(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add image" });
  }
});

router.delete(
  "/products/:productId/images/:imageId",
  requireAuth,
  async (req, res) => {
    try {
      const productId = parseInt(String(req.params.productId));
      const imageId = parseInt(String(req.params.imageId));
      if (!(await assertProductBelongsToSeller(productId, req.seller!.sellerId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await db
        .delete(productImagesTable)
        .where(
          and(
            eq(productImagesTable.id, imageId),
            eq(productImagesTable.productId, productId)
          )
        );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete image" });
    }
  }
);

router.patch(
  "/products/:productId/images/reorder",
  requireAuth,
  async (req, res) => {
    try {
      const productId = parseInt(String(req.params.productId));
      if (!(await assertProductBelongsToSeller(productId, req.seller!.sellerId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { imageIds } = req.body as { imageIds: number[] };
      await Promise.all(
        imageIds.map((id, index) =>
          db
            .update(productImagesTable)
            .set({ displayOrder: index })
            .where(
              and(
                eq(productImagesTable.id, id),
                eq(productImagesTable.productId, productId)
              )
            )
        )
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reorder images" });
    }
  }
);

// ── Product variants ─────────────────────────────────────────────────────────

router.post(
  "/products/:productId/variants",
  requireAuth,
  async (req, res) => {
    try {
      const productId = parseInt(String(req.params.productId));
      if (!(await assertProductBelongsToSeller(productId, req.seller!.sellerId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { variantType, options } = req.body as {
        variantType: string;
        options: string[];
      };
      if (!variantType || !Array.isArray(options)) {
        res.status(400).json({ error: "variantType and options required" });
        return;
      }
      const [variant] = await db
        .insert(productVariantsTable)
        .values({ productId, variantType, options })
        .returning();
      res.status(201).json(variant);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add variant" });
    }
  }
);

router.patch(
  "/products/:productId/variants/:variantId",
  requireAuth,
  async (req, res) => {
    try {
      const productId = parseInt(String(req.params.productId));
      const variantId = parseInt(String(req.params.variantId));
      if (!(await assertProductBelongsToSeller(productId, req.seller!.sellerId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { variantType, options } = req.body as {
        variantType?: string;
        options?: string[];
      };
      const updates: Partial<typeof productVariantsTable.$inferInsert> = {};
      if (variantType !== undefined) updates.variantType = variantType;
      if (options !== undefined) updates.options = options;
      const [updated] = await db
        .update(productVariantsTable)
        .set(updates)
        .where(
          and(
            eq(productVariantsTable.id, variantId),
            eq(productVariantsTable.productId, productId)
          )
        )
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update variant" });
    }
  }
);

router.delete(
  "/products/:productId/variants/:variantId",
  requireAuth,
  async (req, res) => {
    try {
      const productId = parseInt(String(req.params.productId));
      const variantId = parseInt(String(req.params.variantId));
      if (!(await assertProductBelongsToSeller(productId, req.seller!.sellerId))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await db
        .delete(productVariantsTable)
        .where(
          and(
            eq(productVariantsTable.id, variantId),
            eq(productVariantsTable.productId, productId)
          )
        );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete variant" });
    }
  }
);

export default router;
