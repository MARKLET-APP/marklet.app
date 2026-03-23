import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const scrapCentersTable = pgTable("scrap_centers", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id"),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  logo: text("logo"),
  coverImage: text("cover_image"),
  description: text("description"),
  acceptedTypes: text("accepted_types"),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("0"),
  isFeatured: boolean("is_featured").default(false),
  isVerified: boolean("is_verified").default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ScrapCenter = typeof scrapCentersTable.$inferSelect;
