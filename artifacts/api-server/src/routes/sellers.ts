import { Router } from "express";
import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getSellerPlan, getPlanLimits } from "../lib/planLimits.js";

const router = Router();

const RESERVED_SLUGS = new Set([
  "www", "api", "admin", "store", "app", "mail", "support", "help", "chatcart",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/;

function validateSlug(slug: string): string | null {
  if (slug.length < 3) return "Store URL must be at least 3 characters.";
  if (slug.length > 30) return "Store URL must be 30 characters or fewer.";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Only lowercase letters, numbers, and hyphens are allowed.";
  if (slug.startsWith("-") || slug.endsWith("-")) return "Store URL cannot start or end with a hyphen.";
  if (RESERVED_SLUGS.has(slug)) return "This URL is reserved — please choose a different one.";
  return null;
}

router.patch("/sellers/me", requireAuth, async (req, res) => {
  try {
    const { storeName, whatsappNumber, bannerImageUrl, tagline, subdomain } = req.body as {
      storeName?: string;
      whatsappNumber?: string;
      bannerImageUrl?: string | null;
      tagline?: string | null;
      subdomain?: string;
    };

    const hasBrandingUpdate = bannerImageUrl !== undefined || tagline !== undefined;
    if (hasBrandingUpdate) {
      const plan = await getSellerPlan(req.seller!.sellerId);
      if (!getPlanLimits(plan).brandingEnabled) {
        res.status(403).json({
          error: "Custom store branding (logo and tagline) is available on the Pro plan. Upgrade to customise your store.",
          upgradeRequired: true,
        });
        return;
      }
    }

    const updates: Partial<typeof sellersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (storeName !== undefined) updates.storeName = storeName;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (bannerImageUrl !== undefined) updates.bannerImageUrl = bannerImageUrl;
    if (tagline !== undefined) updates.tagline = tagline;

    if (subdomain !== undefined) {
      const err = validateSlug(subdomain);
      if (err) {
        res.status(400).json({ error: err });
        return;
      }
      const existing = await db
        .select({ id: sellersTable.id })
        .from(sellersTable)
        .where(
          and(
            eq(sellersTable.subdomain, subdomain),
            ne(sellersTable.id, req.seller!.sellerId)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: "This URL is already taken — please try another." });
        return;
      }
      updates.subdomain = subdomain;
    }

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
