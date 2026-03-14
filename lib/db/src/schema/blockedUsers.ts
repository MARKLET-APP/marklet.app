import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blockedUsersTable = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  blockedUserId: integer("blocked_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBlockedUserSchema = createInsertSchema(blockedUsersTable).omit({ id: true, createdAt: true });
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type BlockedUser = typeof blockedUsersTable.$inferSelect;
