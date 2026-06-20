import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/categories", requireAuth, async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.sellerId, req.seller!.sellerId))
      .orderBy(categoriesTable.name);
    res.json(
      categories.map((c) => ({
        ...c,
        dozenDiscountPercent:
          c.dozenDiscountPercent != null
            ? parseFloat(c.dozenDiscountPercent as unknown as string)
            : null,
        productCount: 0,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/categories", requireAuth, async (req, res) => {
  try {
    const { name, dozenDiscountPercent } = req.body as {
      name: string;
      dozenDiscountPercent?: number | null;
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
      })
      .returning();
    res.status(201).json({
      ...category,
      dozenDiscountPercent:
        category.dozenDiscountPercent != null
          ? parseFloat(category.dozenDiscountPercent as unknown as string)
          : null,
      productCount: 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/categories/:categoryId", requireAuth, async (req, res) => {
  try {
    const categoryId = parseInt(String(req.params.categoryId));
    const { name, dozenDiscountPercent } = req.body as {
      name: string;
      dozenDiscountPercent?: number | null;
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
    res.json({
      ...updated,
      dozenDiscountPercent:
        updated.dozenDiscountPercent != null
          ? parseFloat(updated.dozenDiscountPercent as unknown as string)
          : null,
      productCount: 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:categoryId", requireAuth, async (req, res) => {
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
