import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export interface PlanLimits {
  maxActiveProducts: number | null;
  variantsEnabled: boolean;
  brandingEnabled: boolean;
  csvImportEnabled: boolean;
  exportEnabled: boolean;
  orderHistoryDays: number | null;
  supportChannel: string;
  supportResponseTime: string;
}

export const LTD_CAP = 100;

export async function getLifetimeCount(): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(sellersTable)
    .where(eq(sellersTable.subscriptionPlan, "lifetime" as never));
  return Number(row?.c ?? 0);
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "pro" || plan === "business" || plan === "lifetime") {
    return {
      maxActiveProducts: null,
      variantsEnabled: true,
      brandingEnabled: true,
      csvImportEnabled: true,
      exportEnabled: true,
      orderHistoryDays: null,
      supportChannel: "WhatsApp + Phone",
      supportResponseTime: "24/7, instant response",
    };
  }
  if (plan === "growth" || plan === "basic") {
    return {
      maxActiveProducts: 100,
      variantsEnabled: true,
      brandingEnabled: false,
      csvImportEnabled: false,
      exportEnabled: false,
      orderHistoryDays: null,
      supportChannel: "Email",
      supportResponseTime: "4-6 hour response",
    };
  }
  return {
    maxActiveProducts: 25,
    variantsEnabled: false,
    brandingEnabled: false,
    csvImportEnabled: false,
    exportEnabled: false,
    orderHistoryDays: 30,
    supportChannel: "Email",
    supportResponseTime: "within 24 hours",
  };
}

export function getPlanDisplayName(plan: string | null | undefined): string {
  if (plan === "pro" || plan === "business") return "Pro";
  if (plan === "growth" || plan === "basic") return "Growth";
  if (plan === "lifetime") return "Lifetime";
  return "Starter";
}

export async function getSellerPlan(sellerId: number): Promise<string> {
  const [row] = await db
    .select({ subscriptionPlan: sellersTable.subscriptionPlan })
    .from(sellersTable)
    .where(eq(sellersTable.id, sellerId))
    .limit(1);
  return row?.subscriptionPlan ?? "pending";
}

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  const seller = (req as any).seller as { sellerId: number } | undefined;
  if (!seller) {
    next();
    return;
  }
  const plan = await getSellerPlan(seller.sellerId);
  if (plan === "pending") {
    res.status(403).json({
      error: "Account pending activation. The platform team will contact you on WhatsApp shortly.",
      code: "PENDING_ACTIVATION",
    });
    return;
  }
  next();
}
