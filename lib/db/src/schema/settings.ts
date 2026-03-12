import { pgTable, text, serial, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#16a34a"),
  secondaryColor: text("secondary_color").notNull().default("#ca8a04"),
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  backgroundImageUrl: text("background_image_url"),
  siteName: text("site_name").notNull().default("سوق السيارات السوري"),
  allowRegistrations: boolean("allow_registrations").notNull().default(true),
  maxListingsPerUser: integer("max_listings_per_user").notNull().default(10),
  featuredListingPrice: numeric("featured_listing_price", { precision: 10, scale: 2 }).notNull().default("5"),
  premiumSubscriptionPrice: numeric("premium_subscription_price", { precision: 10, scale: 2 }).notNull().default("20"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
