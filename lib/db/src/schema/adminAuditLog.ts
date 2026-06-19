import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { adminUsers } from "./adminUsers";

export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsers.id).notNull(),
  action: text("action").notNull(),
  targetSellerId: integer("target_seller_id"),
  targetOrderId: text("target_order_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
