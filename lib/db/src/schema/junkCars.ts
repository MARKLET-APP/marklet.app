import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const junkCarsTable = pgTable("junk_cars", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  type: text("type"),
  model: text("model"),
  year: integer("year"),
  condition: text("condition"),
  price: numeric("price", { precision: 12, scale: 2 }),
  city: text("city"),
  images: text("images").array(),
  description: text("description"),
  followupSentAt: timestamp("followup_sent_at"),
  soldConfirmed: text("sold_confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type JunkCar = typeof junkCarsTable.$inferSelect;
export type NewJunkCar = typeof junkCarsTable.$inferInsert;
