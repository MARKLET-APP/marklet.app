import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const imagesTable = pgTable("images", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  imageUrl: text("image_url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertImageSchema = createInsertSchema(imagesTable).omit({ id: true, createdAt: true });
export type InsertImage = z.infer<typeof insertImageSchema>;
export type CarImage = typeof imagesTable.$inferSelect;
