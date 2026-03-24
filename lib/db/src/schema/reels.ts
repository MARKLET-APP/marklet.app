import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  uploaderId: integer("uploader_id").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title").notNull(),
  desc: text("desc"),
  price: text("price"),
  city: text("city"),
  dealerName: text("dealer_name"),
  dealerId: integer("dealer_id"),
  sponsored: text("sponsored").default("false"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Reel = typeof reelsTable.$inferSelect;
export type NewReel = typeof reelsTable.$inferInsert;
