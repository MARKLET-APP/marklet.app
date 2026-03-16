import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const inspectionCentersTable = pgTable("inspection_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  province: text("province"),
  address: text("address"),
  phone: text("phone"),
  contact: text("contact"),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("0"),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inspectionsTable = pgTable("inspections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  carId: text("car_id"),
  centerId: text("center_id").notNull(),
  date: timestamp("date").notNull(),
  coveragePoints: numeric("coverage_points", { precision: 5, scale: 0 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InspectionCenter = typeof inspectionCentersTable.$inferSelect;
export type Inspection = typeof inspectionsTable.$inferSelect;
