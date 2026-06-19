import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "pro" || plan === "business") {
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
  return "Starter";
}

export async function getSellerPlan(sellerId: number): Promise<string> {
  const [row] = await db
    .select({ subscriptionPlan: sellersTable.subscriptionPlan })
    .from(sellersTable)
    .where(eq(sellersTable.id, sellerId))
    .limit(1);
  return row?.subscriptionPlan ?? "starter";
}
