import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const otpRateLimitsTable = pgTable("otp_rate_limits", {
  phone: text("phone").primaryKey(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  sendCount: integer("send_count").notNull().default(0),
  sendWindowStartedAt: timestamp("send_window_started_at"),
});

export type OtpRateLimit = typeof otpRateLimitsTable.$inferSelect;
