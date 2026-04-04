import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketplaceItemsTable = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("SYP"),
  category: text("category").notNull(),
  condition: text("condition").notNull().default("جيد"),
  images: text("images").array(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  phone: text("phone"),
  shippingAvailable: boolean("shipping_available").notNull().default(false),
  status: text("status").notNull().default("available"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const marketplaceOrdersTable = pgTable("marketplace_orders", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  itemTitle: text("item_title").notNull(),
  itemPrice: numeric("item_price", { precision: 14, scale: 2 }).notNull(),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull(),
  deliveryType: text("delivery_type").notNull().default("pickup"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  shippingStatus: text("shipping_status").notNull().default("pending"),
  buyerName: text("buyer_name"),
  buyerPhone: text("buyer_phone").notNull(),
  buyerAddress: text("buyer_address"),
  sellerAddress: text("seller_address"),
  receiptImage: text("receipt_image"),
  shamCashRef: text("sham_cash_ref"),
  trackingNumber: text("tracking_number"),
  adminNotes: text("admin_notes"),
  buyerNotes: text("buyer_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const shippingRatesTable = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  fromProvince: text("from_province").notNull(),
  toProvince: text("to_province").notNull(),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull().default("5000"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketplaceItemSchema = createInsertSchema(marketplaceItemsTable).omit({
  id: true, createdAt: true, updatedAt: true, viewCount: true,
  isFeatured: true, isHighlighted: true, isActive: true, status: true,
});

export type MarketplaceItem = typeof marketplaceItemsTable.$inferSelect;
export type MarketplaceOrder = typeof marketplaceOrdersTable.$inferSelect;
export type ShippingRate = typeof shippingRatesTable.$inferSelect;
export type InsertMarketplaceItem = z.infer<typeof insertMarketplaceItemSchema>;
