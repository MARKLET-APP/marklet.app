import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("buyer"),
  profilePhoto: text("profile_photo"),
  province: text("province"),
  city: text("city"),
  isVerified: boolean("is_verified").notNull().default(false),
  isPremium: boolean("is_premium").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  whatsapp: text("whatsapp"),
  isFeaturedSeller: boolean("is_featured_seller").notNull().default(false),
  subscriptionActive: boolean("subscription_active").notNull().default(false),
  showroomName: text("showroom_name"),
  showroomAddress: text("showroom_address"),
  showroomPhone: text("showroom_phone"),
  showroomPhoto: text("showroom_photo"),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
