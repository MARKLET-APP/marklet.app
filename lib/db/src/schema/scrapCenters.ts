import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const scrapCentersTable = pgTable("scrap_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  description: text("description"),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("0"),
  isFeatured: boolean("is_featured").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ScrapCenter = typeof scrapCentersTable.$inferSelect;
