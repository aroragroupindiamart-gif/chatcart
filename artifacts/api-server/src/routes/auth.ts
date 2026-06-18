import { Router } from "express";
import { db } from "@workspace/db";
import { sellersTable, otpCodesTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

function generateSubdomain(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `store${digits}`;
}

router.post("/auth/send-otp", async (req, res) => {
  try {
    const { phone } = req.body as { phone: string };
    if (!phone) {
      res.status(400).json({ error: "Phone number required" });
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodesTable).values({ phone: normalizedPhone, code, expiresAt });

    console.log(`[OTP] Phone: ${normalizedPhone} — Code: ${code}`);

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body as { phone: string; code: string };
    if (!phone || !code) {
      res.status(400).json({ error: "Phone and code required" });
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    const now = new Date();

    const [otpRecord] = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.phone, normalizedPhone),
          eq(otpCodesTable.code, code),
          eq(otpCodesTable.used, false),
          gt(otpCodesTable.expiresAt, now)
        )
      )
      .orderBy(otpCodesTable.createdAt)
      .limit(1);

    if (!otpRecord) {
      res.status(401).json({ error: "Invalid or expired OTP" });
      return;
    }

    await db
      .update(otpCodesTable)
      .set({ used: true })
      .where(eq(otpCodesTable.id, otpRecord.id));

    let [seller] = await db
      .select()
      .from(sellersTable)
      .where(eq(sellersTable.phone, normalizedPhone))
      .limit(1);

    if (!seller) {
      const subdomain = generateSubdomain(normalizedPhone);
      [seller] = await db
        .insert(sellersTable)
        .values({
          phone: normalizedPhone,
          storeName: "My Store",
          subdomain,
          whatsappNumber: normalizedPhone,
        })
        .returning();
    }

    const token = signToken({ sellerId: seller.id, phone: seller.phone });
    res.json({ token, seller });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [seller] = await db
      .select()
      .from(sellersTable)
      .where(eq(sellersTable.id, req.seller!.sellerId))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }
    res.json({ seller });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/auth/logout", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
