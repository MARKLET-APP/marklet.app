import { pgTable, serial, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";

export const savedListingsTable = pgTable("saved_listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  listingType: varchar("listing_type", { length: 30 }).notNull(),
  listingId: integer("listing_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("saved_listings_user_type_id").on(t.userId, t.listingType, t.listingId)]);

export type SavedListing = typeof savedListingsTable.$inferSelect;
export type NewSavedListing = typeof savedListingsTable.$inferInsert;
