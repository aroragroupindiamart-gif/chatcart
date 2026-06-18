import { Router } from "express";
import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.patch("/sellers/me", requireAuth, async (req, res) => {
  try {
    const { storeName, whatsappNumber, bannerImageUrl, tagline } = req.body as {
      storeName?: string;
      whatsappNumber?: string;
      bannerImageUrl?: string | null;
      tagline?: string | null;
    };

    const updates: Partial<typeof sellersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (storeName !== undefined) updates.storeName = storeName;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (bannerImageUrl !== undefined) updates.bannerImageUrl = bannerImageUrl;
    if (tagline !== undefined) updates.tagline = tagline;

    const [updated] = await db
      .update(sellersTable)
      .set(updates)
      .where(eq(sellersTable.id, req.seller!.sellerId))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update seller" });
  }
});

export default router;
