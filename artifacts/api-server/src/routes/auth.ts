import { Router } from "express";
import { db } from "@workspace/db";
import { sellersTable, otpCodesTable } from "@workspace/db/schema";
import { eq, and, gt, lt, desc } from "drizzle-orm";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── In-memory rate limiting (resets on server restart — acceptable for v1) ──

interface VerifyState { failures: number; lockedUntil: number; }
const verifyState = new Map<string, VerifyState>();
const sendTimestamps = new Map<string, number[]>();

const MAX_VERIFY_FAILURES = 5;
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SEND_OTP_PER_HOUR = 3;
const SEND_OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isVerifyLocked(phone: string): boolean {
  const state = verifyState.get(phone);
  if (!state) return false;
  if (state.lockedUntil > Date.now()) return true;
  if (state.lockedUntil > 0 && state.lockedUntil <= Date.now()) {
    verifyState.delete(phone);
  }
  return false;
}

function recordVerifyFailure(phone: string): { locked: boolean; remaining: number } {
  const state = verifyState.get(phone) ?? { failures: 0, lockedUntil: 0 };
  state.failures += 1;
  if (state.failures >= MAX_VERIFY_FAILURES) {
    state.lockedUntil = Date.now() + VERIFY_LOCKOUT_MS;
    verifyState.set(phone, state);
    return { locked: true, remaining: 0 };
  }
  verifyState.set(phone, state);
  return { locked: false, remaining: MAX_VERIFY_FAILURES - state.failures };
}

function clearVerifyState(phone: string) {
  verifyState.delete(phone);
}

function checkSendRateLimit(phone: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - SEND_OTP_WINDOW_MS;
  const timestamps = (sendTimestamps.get(phone) ?? []).filter(t => t > windowStart);
  sendTimestamps.set(phone, timestamps);
  if (timestamps.length >= MAX_SEND_OTP_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: MAX_SEND_OTP_PER_HOUR - timestamps.length };
}

function recordSendOtp(phone: string) {
  const timestamps = sendTimestamps.get(phone) ?? [];
  timestamps.push(Date.now());
  sendTimestamps.set(phone, timestamps);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

    // Check lockout from too many failed verify attempts
    if (isVerifyLocked(normalizedPhone)) {
      const state = verifyState.get(normalizedPhone)!;
      const secondsLeft = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      res.status(429).json({
        error: `Too many failed attempts. Please wait ${Math.ceil(secondsLeft / 60)} minutes before requesting a new code.`,
      });
      return;
    }

    // Check send-OTP rate limit (3 per hour)
    const { allowed, remaining } = checkSendRateLimit(normalizedPhone);
    if (!allowed) {
      res.status(429).json({
        error: "Too many OTP requests. Please wait before requesting another code.",
      });
      return;
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodesTable).values({ phone: normalizedPhone, code, expiresAt });
    recordSendOtp(normalizedPhone);

    // Reset verify failure counter — new OTP issued means fresh slate
    clearVerifyState(normalizedPhone);

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

    // Check lockout
    if (isVerifyLocked(normalizedPhone)) {
      const state = verifyState.get(normalizedPhone)!;
      const minutesLeft = Math.ceil((state.lockedUntil - Date.now()) / 60000);
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
          gt(otpCodesTable.expiresAt, now)
        )
      )
      .orderBy(desc(otpCodesTable.createdAt))
      .limit(1);

    // Wrong code OR no active OTP
    if (!otpRecord || otpRecord.code !== otp) {
      const { locked, remaining } = recordVerifyFailure(normalizedPhone);
      if (locked) {
        // Invalidate all pending OTPs for this phone
        await db
          .update(otpCodesTable)
          .set({ used: true })
          .where(
            and(
              eq(otpCodesTable.phone, normalizedPhone),
              eq(otpCodesTable.used, false),
              gt(otpCodesTable.expiresAt, now)
            )
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

    // Valid — mark used and clear rate limit
    await db
      .update(otpCodesTable)
      .set({ used: true })
      .where(eq(otpCodesTable.id, otpRecord.id));

    clearVerifyState(normalizedPhone);

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
      .select({
        id: sellersTable.id,
        phone: sellersTable.phone,
        storeName: sellersTable.storeName,
        subdomain: sellersTable.subdomain,
        whatsappNumber: sellersTable.whatsappNumber,
        bannerImageUrl: sellersTable.bannerImageUrl,
        tagline: sellersTable.tagline,
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

router.post("/auth/logout", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
