import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db/schema";
import { eq, and, ne, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireActiveSubscription } from "../lib/planLimits.js";

const router = Router();

function serializeCategory(
  c: typeof categoriesTable.$inferSelect & { productCount?: number }
) {
  return {
    ...c,
    dozenDiscountPercent:
      c.dozenDiscountPercent != null
        ? parseFloat(c.dozenDiscountPercent as unknown as string)
        : null,
    bulkDiscountMinQty: c.bulkDiscountMinQty ?? null,
    productCount: typeof c.productCount === "number" ? c.productCount : Number(c.productCount ?? 0),
  };
}

router.get("/categories", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const categories = await db
      .select({
        id: categoriesTable.id,
        sellerId: categoriesTable.sellerId,
        name: categoriesTable.name,
        dozenDiscountPercent: categoriesTable.dozenDiscountPercent,
        bulkDiscountMinQty: categoriesTable.bulkDiscountMinQty,
        createdAt: categoriesTable.createdAt,
        productCount: count(productsTable.id),
      })
      .from(categoriesTable)
      .leftJoin(
        productsTable,
        and(
          eq(productsTable.categoryId, categoriesTable.id),
          ne(productsTable.status, "deleted")
        )
      )
      .where(eq(categoriesTable.sellerId, req.seller!.sellerId))
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.name);
    res.json(categories.map((c) => serializeCategory(c)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/categories", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const { name, dozenDiscountPercent, bulkDiscountMinQty } = req.body as {
      name: string;
      dozenDiscountPercent?: number | null;
      bulkDiscountMinQty?: number | null;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: "Category name required" });
      return;
    }
    const [category] = await db
      .insert(categoriesTable)
      .values({
        sellerId: req.seller!.sellerId,
        name: name.trim(),
        dozenDiscountPercent:
          dozenDiscountPercent != null ? String(dozenDiscountPercent) : null,
        bulkDiscountMinQty: bulkDiscountMinQty ?? null,
      })
      .returning();
    res.status(201).json(serializeCategory(category));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/categories/:categoryId", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const categoryId = parseInt(String(req.params.categoryId));
    const { name, dozenDiscountPercent, bulkDiscountMinQty } = req.body as {
      name: string;
      dozenDiscountPercent?: number | null;
      bulkDiscountMinQty?: number | null;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: "Category name required" });
      return;
    }
    const updateValues: Record<string, unknown> = { name: name.trim() };
    if (dozenDiscountPercent !== undefined) {
      updateValues.dozenDiscountPercent =
        dozenDiscountPercent != null ? String(dozenDiscountPercent) : null;
    }
    if (bulkDiscountMinQty !== undefined) {
      updateValues.bulkDiscountMinQty = bulkDiscountMinQty ?? null;
    }
    const [updated] = await db
      .update(categoriesTable)
      .set(updateValues)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          eq(categoriesTable.sellerId, req.seller!.sellerId)
        )
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(serializeCategory(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:categoryId", requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const categoryId = parseInt(String(req.params.categoryId));
    await db
      .delete(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          eq(categoriesTable.sellerId, req.seller!.sellerId)
        )
      );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
