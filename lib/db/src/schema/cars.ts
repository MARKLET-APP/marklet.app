import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const carsTable = pgTable("cars", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  mileage: integer("mileage").notNull(),
  fuelType: text("fuel_type").notNull(),
  transmission: text("transmission").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  saleType: text("sale_type").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCarSchema = createInsertSchema(carsTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof carsTable.$inferSelect;
