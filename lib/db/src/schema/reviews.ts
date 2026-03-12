import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull(),
  reviewedUserId: integer("reviewed_user_id").notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull(),
  comment: text("comment"),
  responseSpeed: integer("response_speed"),
  trustLevel: integer("trust_level"),
  listingAccuracy: integer("listing_accuracy"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
