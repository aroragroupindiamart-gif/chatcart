import { Router } from "express";
import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.put("/sellers/me", requireAuth, async (req, res) => {
  try {
    const { storeName, whatsappNumber } = req.body as {
      storeName?: string;
      whatsappNumber?: string;
    };

    const updates: Partial<typeof sellersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (storeName !== undefined) updates.storeName = storeName;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;

    const [updated] = await db
      .update(sellersTable)
      .set(updates)
      .where(eq(sellersTable.id, req.seller!.sellerId))
      .returning();

    res.json({ seller: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update seller" });
  }
});

export default router;
