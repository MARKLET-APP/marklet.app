import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promotionsTable = pgTable("promotions", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
});

export const insertPromotionSchema = createInsertSchema(promotionsTable).omit({ id: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotionsTable.$inferSelect;
