import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  feedback: text("feedback").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SupportMessage = typeof supportMessagesTable.$inferSelect;
export type Feedback = typeof feedbackTable.$inferSelect;
