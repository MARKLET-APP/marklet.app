import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";

export const showroomsTable = pgTable("showrooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: integer("owner_user_id"),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  city: text("city").notNull(),
  address: text("address"),
  logo: text("logo"),
  coverImage: text("cover_image"),
  description: text("description"),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("0"),
  isVerified: boolean("is_verified").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Showroom = typeof showroomsTable.$inferSelect;
