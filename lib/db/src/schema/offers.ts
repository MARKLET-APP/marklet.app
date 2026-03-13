import { pgTable, serial, integer, numeric, varchar, timestamp } from "drizzle-orm/pg-core";

export const offersTable = pgTable("offers", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  offerPrice: numeric("offer_price").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Offer = typeof offersTable.$inferSelect;
