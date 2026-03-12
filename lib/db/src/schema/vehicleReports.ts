import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehicleReportsTable = pgTable("vehicle_reports", {
  id: serial("id").primaryKey(),
  vin: text("vin"),
  plateNumber: text("plate_number"),
  chassisNumber: text("chassis_number"),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  countryOfOrigin: text("country_of_origin"),
  engineSize: text("engine_size"),
  fuelType: text("fuel_type").notNull(),
  transmission: text("transmission").notNull(),
  engineCapacity: text("engine_capacity"),
  horsepower: integer("horsepower"),
  fuelConsumption: text("fuel_consumption"),
  driveType: text("drive_type"),
  accidentCount: integer("accident_count").notNull().default(0),
  hasMajorRepairs: boolean("has_major_repairs").notNull().default(false),
  hasStructuralDamage: boolean("has_structural_damage").notNull().default(false),
  airbagDeployed: boolean("airbag_deployed").notNull().default(false),
  mileageHistory: jsonb("mileage_history").notNull().default([]),
  ownershipCount: integer("ownership_count").notNull().default(1),
  registrationRegion: text("registration_region"),
  damageStatus: text("damage_status").notNull().default("clean"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVehicleReportSchema = createInsertSchema(vehicleReportsTable).omit({ id: true, createdAt: true });
export type InsertVehicleReport = z.infer<typeof insertVehicleReportSchema>;
export type VehicleReport = typeof vehicleReportsTable.$inferSelect;
