import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const buyRequestsTable = pgTable("buy_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  minYear: integer("min_year"),
  maxYear: integer("max_year"),
  maxPrice: integer("max_price"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  city: varchar("city", { length: 100 }),
  paymentType: varchar("payment_type", { length: 20 }),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  category: varchar("category", { length: 50 }).default("cars"),
  followupSentAt: timestamp("followup_sent_at"),
  soldConfirmed: varchar("sold_confirmed", { length: 10 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BuyRequest = typeof buyRequestsTable.$inferSelect;
export type NewBuyRequest = typeof buyRequestsTable.$inferInsert;
