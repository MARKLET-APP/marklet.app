import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const adViewsTable = pgTable("ad_views", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  userId: integer("user_id"),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export type AdView = typeof adViewsTable.$inferSelect;
