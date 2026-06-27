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
  hourOffset: integer("hour_offset").notNull(),
  message: text("message").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  mediaFilename: text("media_filename"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waInboundLeadsTable = pgTable("wa_inbound_leads", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name"),
  firstMessage: text("first_message"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  matchedSellerId: integer("matched_seller_id").references(() => sellersTable.id, { onDelete: "set null" }),
  messageCount: integer("message_count").notNull().default(1),
  isWarm: boolean("is_warm").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const waInboundMessagesTable = pgTable("wa_inbound_messages", {
  id: serial("id").primaryKey(),
  inboundLeadId: integer("inbound_lead_id").notNull().references(() => waInboundLeadsTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const waCampaignLeadsTable = pgTable("wa_campaign_leads", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => waSequencesTable.id),
  sellerId: integer("seller_id").references(() => sellersTable.id),
  inboundLeadId: integer("inbound_lead_id").references(() => waInboundLeadsTable.id),
  phone: text("phone"),
  currentHourOffset: integer("current_hour_offset").notNull().default(-1),
  nextSendAt: timestamp("next_send_at"),
  lastSentAt: timestamp("last_sent_at"),
  repliedAt: timestamp("replied_at"),
  status: text("status").notNull().default("active"),
  sendFailureCount: integer("send_failure_count").notNull().default(0),
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
export type WAInboundLead = typeof waInboundLeadsTable.$inferSelect;
export type WAInboundMessage = typeof waInboundMessagesTable.$inferSelect;
export type WACampaignLead = typeof waCampaignLeadsTable.$inferSelect;
export type WASendLog = typeof waSendLogTable.$inferSelect;
