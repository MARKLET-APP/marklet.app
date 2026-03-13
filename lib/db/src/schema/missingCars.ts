import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const missingCarsTable = pgTable("missing_cars", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id"),
  image: text("image"),
  brand: text("brand"),
  model: text("model"),
  color: text("color"),
  plateNumber: text("plate_number"),
  city: text("city"),
  description: text("description"),
  isFound: text("is_found").default("no"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MissingCar = typeof missingCarsTable.$inferSelect;
export type NewMissingCar = typeof missingCarsTable.$inferInsert;
