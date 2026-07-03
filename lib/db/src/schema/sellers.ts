import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionPlanEnum = pgEnum("subscription_plan", ["pending", "starter", "growth", "pro", "lifetime"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "trial", "expired", "cancelled", "suspended"]);
export const productImageLayoutEnum = pgEnum("product_image_layout", ["square", "portrait"]);

export const sellersTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  storeName: text("store_name").notNull().default("My Store"),
  subdomain: text("subdomain").notNull().unique(),
  whatsappNumber: text("whatsapp_number").notNull(),
  bannerImageUrl: text("banner_image_url"),
  tagline: text("tagline"),
  productImageLayout: productImageLayoutEnum("product_image_layout").default("square").notNull(),
  tokenVersion: integer("token_version").notNull().default(1),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").default("pending").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial").notNull(),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  suspensionReason: text("suspension_reason"),
  suspendedAt: timestamp("suspended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSellerSchema = createInsertSchema(sellersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Seller = typeof sellersTable.$inferSelect;
