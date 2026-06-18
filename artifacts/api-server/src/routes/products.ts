import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productImagesTable,
  productVariantsTable,
} from "@workspace/db/schema";
import { eq, and, ne, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/products", requireAuth, async (req, res) => {
  try {
    const { categoryId, status } = req.query as {
      categoryId?: string;
      status?: string;
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

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(asc(productsTable.sortOrder), asc(productsTable.createdAt));

    const productIds = products.map((p) => p.id);
    const images =
      productIds.length > 0
        ? await db
            .select()
            .from(productImagesTable)
            .where(
              productIds.length === 1
                ? eq(productImagesTable.productId, productIds[0])
                : undefined
            )
            .orderBy(asc(productImagesTable.displayOrder))
        : [];

    const variants =
      productIds.length > 0
        ? await db
            .select()
            .from(productVariantsTable)
            .where(
              productIds.length === 1
                ? eq(productVariantsTable.productId, productIds[0])
                : undefined
            )
        : [];

    const result = products.map((p) => ({
      ...p,
      images: images.filter((i) => i.productId === p.id),
      variants: variants.filter((v) => v.productId === p.id),
    }));

    res.json({ products: result });
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
      price: string;
      categoryId?: number;
      status?: "active" | "out_of_stock" | "hidden";
      stockCount?: number;
      showWhenOutOfStock?: boolean;
    };
    if (!body.name?.trim() || !body.price) {
      res.status(400).json({ error: "Name and price required" });
      return;
    }
    const [product] = await db
      .insert(productsTable)
      .values({
        sellerId: req.seller!.sellerId,
        name: body.name.trim(),
        description: body.description,
        price: body.price,
        categoryId: body.categoryId ?? null,
        status: body.status ?? "active",
        stockCount: body.stockCount ?? 1,
        showWhenOutOfStock: body.showWhenOutOfStock ?? false,
      })
      .returning();
    res.status(201).json({ product: { ...product, images: [], variants: [] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/products/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
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
    res.json({ product: { ...product, images, variants } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get product" });
  }
});

router.put("/products/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const body = req.body as {
      name?: string;
      description?: string;
      price?: string;
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
    if (body.price !== undefined) updates.price = body.price;
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
    res.json({ product: { ...updated, images, variants } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    await db
      .update(productsTable)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(productsTable.id, productId),
          eq(productsTable.sellerId, req.seller!.sellerId)
        )
      );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

router.post("/products/reorder", requireAuth, async (req, res) => {
  try {
    const { productIds } = req.body as { productIds: number[] };
    if (!Array.isArray(productIds)) {
      res.status(400).json({ error: "productIds array required" });
      return;
    }
    await Promise.all(
      productIds.map((id, index) =>
        db
          .update(productsTable)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(productsTable.id, id),
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

router.post("/products/:productId/images", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
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
    res.status(201).json({ image });
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
      const imageId = parseInt(req.params.imageId);
      await db
        .delete(productImagesTable)
        .where(eq(productImagesTable.id, imageId));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete image" });
    }
  }
);

router.post(
  "/products/:productId/images/reorder",
  requireAuth,
  async (req, res) => {
    try {
      const { imageIds } = req.body as { imageIds: number[] };
      await Promise.all(
        imageIds.map((id, index) =>
          db
            .update(productImagesTable)
            .set({ displayOrder: index })
            .where(eq(productImagesTable.id, id))
        )
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reorder images" });
    }
  }
);

router.post(
  "/products/:productId/variants",
  requireAuth,
  async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
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
      res.status(201).json({ variant });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add variant" });
    }
  }
);

router.put(
  "/products/:productId/variants/:variantId",
  requireAuth,
  async (req, res) => {
    try {
      const variantId = parseInt(req.params.variantId);
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
        .where(eq(productVariantsTable.id, variantId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }
      res.json({ variant: updated });
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
      const variantId = parseInt(req.params.variantId);
      await db
        .delete(productVariantsTable)
        .where(eq(productVariantsTable.id, variantId));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete variant" });
    }
  }
);

export default router;
