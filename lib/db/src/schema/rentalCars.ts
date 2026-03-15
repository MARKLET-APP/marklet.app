import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const rentalCarsTable = pgTable("rental_cars", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  city: text("city"),
  dailyPrice: numeric("daily_price", { precision: 12, scale: 2 }),
  weeklyPrice: numeric("weekly_price", { precision: 12, scale: 2 }),
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }),
  description: text("description"),
  images: text("images").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RentalCar = typeof rentalCarsTable.$inferSelect;
export type NewRentalCar = typeof rentalCarsTable.$inferInsert;
