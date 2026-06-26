import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sellersTable } from "./sellers";

export const waSessionsTable = pgTable("wa_sessions", {
  id: serial("id").primaryKey(),
  phone: text("phone"),
  status: text("status").notNull().default("disconnected"),
  connectedAt: timestamp("connected_at"),
  dailyLimit: integer("daily_limit").notNull().default(30),
  warmupDailyLimit: integer("warmup_daily_limit").notNull().default(10),
  warmupDays: integer("warmup_days").notNull().default(14),
  replyRateThreshold: integer("reply_rate_threshold").notNull().default(10),
  isPaused: boolean("is_paused").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const waSequencesTable = pgTable("wa_sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const waSequenceStepsTable = pgTable("wa_sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => waSequencesTable.id, { onDelete: "cascade" }),
  dayOffset: integer("day_offset").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waCampaignLeadsTable = pgTable("wa_campaign_leads", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => waSequencesTable.id),
  sellerId: integer("seller_id").notNull().references(() => sellersTable.id),
  currentDay: integer("current_day").notNull().default(0),
  nextSendAt: timestamp("next_send_at"),
  lastSentAt: timestamp("last_sent_at"),
  repliedAt: timestamp("replied_at"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waSendLogTable = pgTable("wa_send_log", {
  id: serial("id").primaryKey(),
  toPhone: text("to_phone").notNull(),
  campaignLeadId: integer("campaign_lead_id").references(() => waCampaignLeadsTable.id),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type WASession = typeof waSessionsTable.$inferSelect;
export type WASequence = typeof waSequencesTable.$inferSelect;
export type WASequenceStep = typeof waSequenceStepsTable.$inferSelect;
export type WACampaignLead = typeof waCampaignLeadsTable.$inferSelect;
export type WASendLog = typeof waSendLogTable.$inferSelect;
