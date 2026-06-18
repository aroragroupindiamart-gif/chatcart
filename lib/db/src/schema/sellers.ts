import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sellersTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  storeName: text("store_name").notNull().default("My Store"),
  subdomain: text("subdomain").notNull().unique(),
  whatsappNumber: text("whatsapp_number").notNull(),
  bannerImageUrl: text("banner_image_url"),
  tagline: text("tagline"),
  tokenVersion: integer("token_version").notNull().default(1),
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
