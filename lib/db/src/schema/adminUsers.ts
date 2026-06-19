import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const adminRoleEnum = pgEnum("admin_role", ["super_admin"]);

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").default("super_admin").notNull(),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  loginLockedUntil: timestamp("login_locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});
