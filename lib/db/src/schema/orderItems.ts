import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }).notNull(),
  variantSnapshot: text("variant_snapshot"),
  productImageSnapshot: text("product_image_snapshot"),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OrderItem = typeof orderItemsTable.$inferSelect;
