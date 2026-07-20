import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { and, lt, ne } from "drizzle-orm";
import { logger } from "./logger.js";

export async function checkExpiredSubscriptions(): Promise<void> {
  try {
    const now = new Date();
    // Find all sellers whose subscriptionPlan is not pending or lifetime, and whose subscriptionEndDate is in the past
    const expiredSellers = await db
      .update(sellersTable)
      .set({
        subscriptionPlan: "pending",
        subscriptionStatus: "expired",
        updatedAt: now,
      })
      .where(
        and(
          ne(sellersTable.subscriptionPlan, "pending"),
          ne(sellersTable.subscriptionPlan, "lifetime"),
          lt(sellersTable.subscriptionEndDate, now)
        )
      )
      .returning({ id: sellersTable.id, storeName: sellersTable.storeName });

    if (expiredSellers.length > 0) {
      logger.info(
        { expiredCount: expiredSellers.length, sellers: expiredSellers.map((s) => s.id) },
        `[SUBSCRIPTION] Reverted ${expiredSellers.length} expired sellers to pending state: ${expiredSellers.map(s => s.storeName).join(", ")}`
      );
    }
  } catch (e) {
    logger.error({ err: e }, "[SUBSCRIPTION] Expiry check scheduler error");
  }
}

export function startSubscriptionScheduler(): void {
  logger.info("[SUBSCRIPTION] Expiry check scheduler started (60s interval)");
  
  // Run once immediately on start
  checkExpiredSubscriptions().catch((e) => logger.error({ err: e }, "[SUBSCRIPTION] Initial boot check error"));

  setInterval(async () => {
    try {
      await checkExpiredSubscriptions();
    } catch (e) {
      logger.error({ err: e }, "[SUBSCRIPTION] Interval runner error");
    }
  }, 60000);
}
