import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const realEstateTable = pgTable("real_estate", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  listingType: text("listing_type").notNull(), // بيع | إيجار
  subCategory: text("sub_category").notNull(), // شقق | منازل | أراضي | مكاتب | محلات | مستودعات
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  area: numeric("area", { precision: 10, scale: 2 }),
  rooms: integer("rooms"),
  bathrooms: integer("bathrooms"),
  floor: integer("floor"),
  province: text("province").notNull(),
  city: text("city").notNull(),
  location: text("location"),
  phone: text("phone"),
  description: text("description"),
  images: text("images").array(),
  status: text("status").notNull().default("pending"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRealEstateSchema = createInsertSchema(realEstateTable).omit({
  id: true, createdAt: true, updatedAt: true, viewCount: true,
});

export type RealEstate = typeof realEstateTable.$inferSelect;
export type NewRealEstate = typeof realEstateTable.$inferInsert;
export type InsertRealEstate = z.infer<typeof insertRealEstateSchema>;
