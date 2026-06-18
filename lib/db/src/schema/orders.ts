import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sellersTable } from "./sellers";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "fulfilled",
]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => sellersTable.id, { onDelete: "cascade" }),
  customerContact: text("customer_contact"),
  status: orderStatusEnum("status").default("pending").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Order = typeof ordersTable.$inferSelect;
