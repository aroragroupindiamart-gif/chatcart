import { Router } from "express";
import { db } from "@workspace/db";
import { sellersTable, otpCodesTable, otpRateLimitsTable } from "@workspace/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_VERIFY_FAILURES = 5;
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_SEND_OTP_PER_HOUR = 3;
const SEND_OTP_WINDOW_MS = 60 * 60 * 1000;

// ── Persistent rate-limit helpers (DB-backed) ─────────────────────────────────

async function isVerifyLocked(phone: string): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const [row] = await db
    .select({ lockedUntil: otpRateLimitsTable.lockedUntil })
    .from(otpRateLimitsTable)
    .where(eq(otpRateLimitsTable.phone, phone))
    .limit(1);
  if (!row?.lockedUntil) return { locked: false, lockedUntil: null };
  if (row.lockedUntil > new Date()) return { locked: true, lockedUntil: row.lockedUntil };
  return { locked: false, lockedUntil: null };
}

async function recordVerifyFailure(phone: string): Promise<{ locked: boolean; remaining: number }> {
  const [row] = await db
    .insert(otpRateLimitsTable)
    .values({ phone, failedAttempts: 1 })
    .onConflictDoUpdate({
      target: otpRateLimitsTable.phone,
      set: { failedAttempts: sql`${otpRateLimitsTable.failedAttempts} + 1` },
    })
    .returning();

  if (row.failedAttempts >= MAX_VERIFY_FAILURES) {
    const lockedUntil = new Date(Date.now() + VERIFY_LOCKOUT_MS);
    await db
      .update(otpRateLimitsTable)
      .set({ lockedUntil })
      .where(eq(otpRateLimitsTable.phone, phone));
    return { locked: true, remaining: 0 };
  }
  return { locked: false, remaining: MAX_VERIFY_FAILURES - row.failedAttempts };
}

async function clearVerifyState(phone: string): Promise<void> {
  await db
    .insert(otpRateLimitsTable)
    .values({ phone, failedAttempts: 0, lockedUntil: null })
    .onConflictDoUpdate({
      target: otpRateLimitsTable.phone,
      set: { failedAttempts: 0, lockedUntil: null },
    });
}

async function checkSendRateLimit(phone: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - SEND_OTP_WINDOW_MS);
  const [row] = await db
    .select({
      sendCount: otpRateLimitsTable.sendCount,
      sendWindowStartedAt: otpRateLimitsTable.sendWindowStartedAt,
    })
    .from(otpRateLimitsTable)
    .where(eq(otpRateLimitsTable.phone, phone))
    .limit(1);
  if (!row || !row.sendWindowStartedAt || row.sendWindowStartedAt < windowStart) {
    return { allowed: true, remaining: MAX_SEND_OTP_PER_HOUR };
  }
  if (row.sendCount >= MAX_SEND_OTP_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: MAX_SEND_OTP_PER_HOUR - row.sendCount };
}

async function recordSendOtp(phone: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(Date.now() - SEND_OTP_WINDOW_MS);
  const [existing] = await db
    .select({ sendWindowStartedAt: otpRateLimitsTable.sendWindowStartedAt })
    .from(otpRateLimitsTable)
    .where(eq(otpRateLimitsTable.phone, phone))
    .limit(1);
  if (!existing || !existing.sendWindowStartedAt || existing.sendWindowStartedAt < windowStart) {
    await db
      .insert(otpRateLimitsTable)
      .values({ phone, sendCount: 1, sendWindowStartedAt: now })
      .onConflictDoUpdate({
        target: otpRateLimitsTable.phone,
        set: { sendCount: 1, sendWindowStartedAt: now },
      });
  } else {
    await db
      .update(otpRateLimitsTable)
      .set({ sendCount: sql`${otpRateLimitsTable.sendCount} + 1` })
      .where(eq(otpRateLimitsTable.phone, phone));
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/auth/send-otp", async (req, res) => {
  try {
    const { phone } = req.body as { phone: string };
    if (!phone) {
      res.status(400).json({ error: "Phone number required" });
      return;
    }
    const normalizedPhone = normalizePhone(phone);

    const { locked: isLocked, lockedUntil } = await isVerifyLocked(normalizedPhone);
    if (isLocked) {
      const secondsLeft = Math.ceil((lockedUntil!.getTime() - Date.now()) / 1000);
      res.status(429).json({
        error: `Too many failed attempts. Please wait ${Math.ceil(secondsLeft / 60)} minutes before requesting a new code.`,
      });
      return;
    }

    const { allowed, remaining } = await checkSendRateLimit(normalizedPhone);
    if (!allowed) {
      res.status(429).json({
        error: "Too many OTP requests. Please wait before requesting another code.",
      });
      return;
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodesTable).values({ phone: normalizedPhone, code, expiresAt });
    await recordSendOtp(normalizedPhone);
    await clearVerifyState(normalizedPhone);

    console.log(`[OTP] Phone: ${normalizedPhone} — Code: ${code}`);

    res.json({ success: true, message: "OTP sent", remainingSends: remaining - 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body as { phone: string; otp: string };
    if (!phone || !otp) {
      res.status(400).json({ error: "Phone and OTP required" });
      return;
    }
    const normalizedPhone = normalizePhone(phone);

    const { locked: isLocked, lockedUntil } = await isVerifyLocked(normalizedPhone);
    if (isLocked) {
      const minutesLeft = Math.ceil((lockedUntil!.getTime() - Date.now()) / 60000);
      res.status(429).json({
        error: `Account locked due to too many failed attempts. Please wait ${minutesLeft} minute(s) and request a new code.`,
      });
      return;
    }

    const now = new Date();
    const [otpRecord] = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.phone, normalizedPhone),
          eq(otpCodesTable.used, false),
          gt(otpCodesTable.expiresAt, now),
        ),
      )
      .orderBy(desc(otpCodesTable.createdAt))
      .limit(1);

    if (!otpRecord || otpRecord.code !== otp) {
      const { locked, remaining } = await recordVerifyFailure(normalizedPhone);
      if (locked) {
        await db
          .update(otpCodesTable)
          .set({ used: true })
          .where(
            and(
              eq(otpCodesTable.phone, normalizedPhone),
              eq(otpCodesTable.used, false),
              gt(otpCodesTable.expiresAt, now),
            ),
          );
        res.status(429).json({
          error: "Too many incorrect attempts. Your code has been invalidated. Please request a new one in 15 minutes.",
        });
      } else {
        res.status(401).json({
          error: `Invalid or expired OTP. ${remaining} attempt(s) remaining.`,
        });
      }
      return;
    }

    await db
      .update(otpCodesTable)
      .set({ used: true })
      .where(eq(otpCodesTable.id, otpRecord.id));

    await clearVerifyState(normalizedPhone);

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

    const token = signToken({ sellerId: seller.id, phone: seller.phone, tokenVersion: seller.tokenVersion });
    const { tokenVersion: _tv, ...sellerForClient } = seller;
    res.json({ token, seller: sellerForClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [seller] = await db
      .select({
        id: sellersTable.id,
        phone: sellersTable.phone,
        storeName: sellersTable.storeName,
        subdomain: sellersTable.subdomain,
        whatsappNumber: sellersTable.whatsappNumber,
        bannerImageUrl: sellersTable.bannerImageUrl,
        tagline: sellersTable.tagline,
        subscriptionPlan: sellersTable.subscriptionPlan,
        subscriptionStatus: sellersTable.subscriptionStatus,
        createdAt: sellersTable.createdAt,
        updatedAt: sellersTable.updatedAt,
      })
      .from(sellersTable)
      .where(eq(sellersTable.id, req.seller!.sellerId))
      .limit(1);

    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }
    res.json(seller);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    await db
      .update(sellersTable)
      .set({ tokenVersion: sql`${sellersTable.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(sellersTable.id, req.seller!.sellerId));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;
