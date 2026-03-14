import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const carPartsTable = pgTable("car_parts", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  name: text("name").notNull(),
  carType: text("car_type"),
  model: text("model"),
  year: integer("year"),
  condition: text("condition"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  city: text("city"),
  images: text("images").array(),
  description: text("description"),
  followupSentAt: timestamp("followup_sent_at"),
  soldConfirmed: text("sold_confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CarPart = typeof carPartsTable.$inferSelect;
export type NewCarPart = typeof carPartsTable.$inferInsert;
