import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  variantType: text("variant_type").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductVariant = typeof productVariantsTable.$inferSelect;
