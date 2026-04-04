import { Router } from "express";
import { db } from "@workspace/db";
import {
  marketplaceItemsTable, marketplaceOrdersTable, shippingRatesTable,
  usersTable, notificationsTable, reviewsTable,
} from "@workspace/db/schema";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../lib/auth";
import type { Response, NextFunction } from "express";
import { generateMarketplaceDescription } from "../lib/openai.js";

const router = Router();
const authGuard = [authMiddleware];
const adminGuard = [authMiddleware, adminMiddleware];

const SYRIAN_PROVINCES = [
  "دمشق","ريف دمشق","حلب","حمص","حماة","اللاذقية",
  "طرطوس","إدلب","دير الزور","الرقة","الحسكة","درعا","السويداء","القنيطرة",
];

// ── Helper: send notification ─────────────────────────────────────────────────
async function notify(userId: number, title: string, body: string, type: string, refId?: number) {
  try {
    await db.insert(notificationsTable).values({ userId, title, body, type, referenceId: refId ?? null });
  } catch { /* non-critical */ }
}

// ── Helper: get shipping rate between two provinces ───────────────────────────
async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 2500;
  const [specific] = await db.select({ rate: shippingRatesTable.rate })
    .from(shippingRatesTable)
    .where(and(eq(shippingRatesTable.fromProvince, from), eq(shippingRatesTable.toProvince, to)));
  if (specific) return Number(specific.rate);
  const [rev] = await db.select({ rate: shippingRatesTable.rate })
    .from(shippingRatesTable)
    .where(and(eq(shippingRatesTable.fromProvince, to), eq(shippingRatesTable.toProvince, from)));
  if (rev) return Number(rev.rate);
  return 5000;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES — Marketplace Items
// ══════════════════════════════════════════════════════════════════════════════

// GET /marketplace — list items
router.get("/marketplace", async (req, res): Promise<void> => {
  const { q, category, condition, province, shipping, page = "1" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limit = 30;
  const offset = (pageNum - 1) * limit;

  const conditions = [
    eq(marketplaceItemsTable.status, "available"),
    eq(marketplaceItemsTable.isActive, true),
  ];
  if (q) conditions.push(or(
    ilike(marketplaceItemsTable.title, `%${q}%`),
    ilike(marketplaceItemsTable.description, `%${q}%`),
  ) as any);
  if (category) conditions.push(eq(marketplaceItemsTable.category, category));
  if (condition) conditions.push(eq(marketplaceItemsTable.condition, condition));
  if (province) conditions.push(eq(marketplaceItemsTable.province, province));
  if (shipping === "true") conditions.push(eq(marketplaceItemsTable.shippingAvailable, true));

  const items = await db.select({
    id: marketplaceItemsTable.id,
    sellerId: marketplaceItemsTable.sellerId,
    title: marketplaceItemsTable.title,
    price: marketplaceItemsTable.price,
    currency: marketplaceItemsTable.currency,
    category: marketplaceItemsTable.category,
    condition: marketplaceItemsTable.condition,
    images: marketplaceItemsTable.images,
    province: marketplaceItemsTable.province,
    city: marketplaceItemsTable.city,
    shippingAvailable: marketplaceItemsTable.shippingAvailable,
    isFeatured: marketplaceItemsTable.isFeatured,
    isHighlighted: marketplaceItemsTable.isHighlighted,
    viewCount: marketplaceItemsTable.viewCount,
    createdAt: marketplaceItemsTable.createdAt,
    sellerName: usersTable.name,
  })
    .from(marketplaceItemsTable)
    .leftJoin(usersTable, eq(marketplaceItemsTable.sellerId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(marketplaceItemsTable.isFeatured), desc(marketplaceItemsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(items);
});

// GET /marketplace/my — seller's own items
router.get("/marketplace/my", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const items = await db.select()
    .from(marketplaceItemsTable)
    .where(eq(marketplaceItemsTable.sellerId, req.user!.id))
    .orderBy(desc(marketplaceItemsTable.createdAt));
  res.json(items);
});

// GET /marketplace/:id — item detail
router.get("/marketplace/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [item] = await db.select({
    id: marketplaceItemsTable.id,
    sellerId: marketplaceItemsTable.sellerId,
    title: marketplaceItemsTable.title,
    description: marketplaceItemsTable.description,
    price: marketplaceItemsTable.price,
    currency: marketplaceItemsTable.currency,
    category: marketplaceItemsTable.category,
    condition: marketplaceItemsTable.condition,
    images: marketplaceItemsTable.images,
    province: marketplaceItemsTable.province,
    city: marketplaceItemsTable.city,
    phone: marketplaceItemsTable.phone,
    shippingAvailable: marketplaceItemsTable.shippingAvailable,
    status: marketplaceItemsTable.status,
    isFeatured: marketplaceItemsTable.isFeatured,
    isHighlighted: marketplaceItemsTable.isHighlighted,
    viewCount: marketplaceItemsTable.viewCount,
    createdAt: marketplaceItemsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(marketplaceItemsTable)
    .leftJoin(usersTable, eq(marketplaceItemsTable.sellerId, usersTable.id))
    .where(eq(marketplaceItemsTable.id, id));

  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

// POST /marketplace/:id/view — increment view count
router.post("/marketplace/:id/view", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!isNaN(id)) {
    await db.update(marketplaceItemsTable)
      .set({ viewCount: sql`${marketplaceItemsTable.viewCount} + 1` })
      .where(eq(marketplaceItemsTable.id, id));
  }
  res.sendStatus(204);
});

// POST /marketplace — create item
router.post("/marketplace", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, price, currency = "SYP", category, condition = "جيد",
    images, province, city, phone, shippingAvailable = false } = req.body;

  if (!title || !price || !category || !province || !city) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ error: "Invalid price" }); return;
  }

  const [item] = await db.insert(marketplaceItemsTable).values({
    sellerId: req.user!.id,
    title, description: description || null,
    price: numPrice.toString(),
    currency, category, condition,
    images: Array.isArray(images) ? images.filter(Boolean) : [],
    province, city,
    phone: phone || null,
    shippingAvailable: Boolean(shippingAvailable),
    status: "pending", // ← يخضع لمراجعة الأدمن قبل النشر
  }).returning();

  // إشعار للمستخدم بأن إعلانه قيد المراجعة
  await notify(req.user!.id, "إعلانك قيد المراجعة ⏳", "تم استلام إعلانك وسيتم مراجعته ونشره قريباً", "marketplace_pending", item.id);

  res.status(201).json({ ...item, message: "تم إرسال إعلانك للمراجعة" });
});

// PUT /marketplace/:id — update item (seller only)
router.put("/marketplace/:id", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [item] = await db.select({ sellerId: marketplaceItemsTable.sellerId })
    .from(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  if (item.sellerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { title, description, price, category, condition, images, province, city, phone, shippingAvailable } = req.body;
  const updateData: Record<string, any> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (price !== undefined) updateData.price = String(Number(price));
  if (category !== undefined) updateData.category = category;
  if (condition !== undefined) updateData.condition = condition;
  if (images !== undefined) updateData.images = Array.isArray(images) ? images.filter(Boolean) : [];
  if (province !== undefined) updateData.province = province;
  if (city !== undefined) updateData.city = city;
  if (phone !== undefined) updateData.phone = phone;
  if (shippingAvailable !== undefined) updateData.shippingAvailable = Boolean(shippingAvailable);

  const [updated] = await db.update(marketplaceItemsTable).set(updateData)
    .where(eq(marketplaceItemsTable.id, id)).returning();
  res.json(updated);
});

// DELETE /marketplace/:id — delete (seller only)
router.delete("/marketplace/:id", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [item] = await db.select({ sellerId: marketplaceItemsTable.sellerId })
    .from(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  if (item.sellerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  res.sendStatus(204);
});

// ══════════════════════════════════════════════════════════════════════════════
// SHIPPING RATES — Public
// ══════════════════════════════════════════════════════════════════════════════

// GET /shipping-rates — all rates
router.get("/shipping-rates", async (_req, res): Promise<void> => {
  const rates = await db.select().from(shippingRatesTable).orderBy(
    shippingRatesTable.fromProvince, shippingRatesTable.toProvince
  );
  res.json({ rates, defaultRate: 5000, sameCityRate: 2500 });
});

// GET /shipping-rates/:from/:to — specific rate
router.get("/shipping-rates/:from/:to", async (req, res): Promise<void> => {
  const { from, to } = req.params;
  const rate = await getRate(from, to);
  res.json({ fromProvince: from, toProvince: to, rate });
});

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════════════════════════

// POST /marketplace/:id/order — place an order
router.post("/marketplace/:id/order", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const itemId = parseInt(req.params.id, 10);
  if (isNaN(itemId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [item] = await db.select()
    .from(marketplaceItemsTable)
    .where(and(eq(marketplaceItemsTable.id, itemId), eq(marketplaceItemsTable.status, "available")));
  if (!item) { res.status(404).json({ error: "Item not found or not available" }); return; }
  if (item.sellerId === req.user!.id) { res.status(400).json({ error: "Cannot order your own item" }); return; }

  const { deliveryType = "pickup", buyerPhone, buyerAddress, buyerNotes, buyerName } = req.body;
  if (!buyerPhone) { res.status(400).json({ error: "Phone number required" }); return; }
  if (deliveryType === "shipping" && !item.shippingAvailable) {
    res.status(400).json({ error: "Shipping not available for this item" }); return;
  }
  if (deliveryType === "shipping" && !buyerAddress) {
    res.status(400).json({ error: "Buyer address required for shipping" }); return;
  }

  const itemPrice = Number(item.price);
  let shippingCost = 0;
  if (deliveryType === "shipping") {
    const [sellerUser] = await db.select({ province: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, item.sellerId));
    shippingCost = await getRate(item.province, item.province);
    shippingCost = 5000;
  }
  const totalPrice = itemPrice + shippingCost;

  const [order] = await db.insert(marketplaceOrdersTable).values({
    itemId,
    buyerId: req.user!.id,
    sellerId: item.sellerId,
    itemTitle: item.title,
    itemPrice: itemPrice.toString(),
    shippingCost: shippingCost.toString(),
    totalPrice: totalPrice.toString(),
    deliveryType,
    buyerName: buyerName || req.user!.name || null,
    buyerPhone,
    buyerAddress: deliveryType === "shipping" ? buyerAddress : null,
    buyerNotes: buyerNotes || null,
  }).returning();

  await db.update(marketplaceItemsTable)
    .set({ status: "reserved" })
    .where(eq(marketplaceItemsTable.id, itemId));

  await notify(item.sellerId, "📦 طلب شراء جديد",
    `${req.user!.name} يريد شراء "${item.title}"`, "marketplace_order", order.id);

  res.status(201).json(order);
});

// GET /marketplace-orders/buying — my purchases
router.get("/marketplace-orders/buying", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const orders = await db.select({
    id: marketplaceOrdersTable.id,
    itemId: marketplaceOrdersTable.itemId,
    sellerId: marketplaceOrdersTable.sellerId,
    itemTitle: marketplaceOrdersTable.itemTitle,
    itemPrice: marketplaceOrdersTable.itemPrice,
    shippingCost: marketplaceOrdersTable.shippingCost,
    totalPrice: marketplaceOrdersTable.totalPrice,
    deliveryType: marketplaceOrdersTable.deliveryType,
    paymentStatus: marketplaceOrdersTable.paymentStatus,
    shippingStatus: marketplaceOrdersTable.shippingStatus,
    buyerName: marketplaceOrdersTable.buyerName,
    buyerPhone: marketplaceOrdersTable.buyerPhone,
    buyerAddress: marketplaceOrdersTable.buyerAddress,
    receiptImage: marketplaceOrdersTable.receiptImage,
    shamCashRef: marketplaceOrdersTable.shamCashRef,
    trackingNumber: marketplaceOrdersTable.trackingNumber,
    adminNotes: marketplaceOrdersTable.adminNotes,
    buyerNotes: marketplaceOrdersTable.buyerNotes,
    createdAt: marketplaceOrdersTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
    itemImages: marketplaceItemsTable.images,
  })
    .from(marketplaceOrdersTable)
    .leftJoin(usersTable, eq(marketplaceOrdersTable.sellerId, usersTable.id))
    .leftJoin(marketplaceItemsTable, eq(marketplaceOrdersTable.itemId, marketplaceItemsTable.id))
    .where(eq(marketplaceOrdersTable.buyerId, req.user!.id))
    .orderBy(desc(marketplaceOrdersTable.createdAt));
  res.json(orders);
});

// GET /marketplace-orders/selling — my sales
router.get("/marketplace-orders/selling", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const orders = await db.select({
    id: marketplaceOrdersTable.id,
    itemId: marketplaceOrdersTable.itemId,
    buyerId: marketplaceOrdersTable.buyerId,
    itemTitle: marketplaceOrdersTable.itemTitle,
    itemPrice: marketplaceOrdersTable.itemPrice,
    shippingCost: marketplaceOrdersTable.shippingCost,
    totalPrice: marketplaceOrdersTable.totalPrice,
    deliveryType: marketplaceOrdersTable.deliveryType,
    paymentStatus: marketplaceOrdersTable.paymentStatus,
    shippingStatus: marketplaceOrdersTable.shippingStatus,
    buyerName: marketplaceOrdersTable.buyerName,
    buyerPhone: marketplaceOrdersTable.buyerPhone,
    buyerAddress: marketplaceOrdersTable.buyerAddress,
    receiptImage: marketplaceOrdersTable.receiptImage,
    trackingNumber: marketplaceOrdersTable.trackingNumber,
    adminNotes: marketplaceOrdersTable.adminNotes,
    buyerNotes: marketplaceOrdersTable.buyerNotes,
    createdAt: marketplaceOrdersTable.createdAt,
    buyerDisplayName: usersTable.name,
    itemImages: marketplaceItemsTable.images,
  })
    .from(marketplaceOrdersTable)
    .leftJoin(usersTable, eq(marketplaceOrdersTable.buyerId, usersTable.id))
    .leftJoin(marketplaceItemsTable, eq(marketplaceOrdersTable.itemId, marketplaceItemsTable.id))
    .where(eq(marketplaceOrdersTable.sellerId, req.user!.id))
    .orderBy(desc(marketplaceOrdersTable.createdAt));
  res.json(orders);
});

// POST /marketplace-orders/:id/receipt — upload receipt image
router.post("/marketplace-orders/:id/receipt", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [order] = await db.select()
    .from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  if (order.buyerId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
  if (order.paymentStatus !== "pending" && order.paymentStatus !== "payment_rejected") {
    res.status(400).json({ error: "Cannot upload receipt for this order status" }); return;
  }

  const { receiptImage, shamCashRef } = req.body;
  if (!receiptImage) { res.status(400).json({ error: "Receipt image required" }); return; }

  const [updated] = await db.update(marketplaceOrdersTable)
    .set({ receiptImage, shamCashRef: shamCashRef || null, paymentStatus: "receipt_uploaded" })
    .where(eq(marketplaceOrdersTable.id, id)).returning();

  const [seller] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.id, order.sellerId));
  await notify(order.sellerId, "💰 إيصال دفع جديد",
    `تم رفع إيصال الدفع للطلب رقم #${id} — "${order.itemTitle}"`, "marketplace_order", id);

  res.json(updated);
});

// PATCH /marketplace-orders/:id/cancel — cancel order (buyer, if pending)
router.patch("/marketplace-orders/:id/cancel", ...authGuard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [order] = await db.select()
    .from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  if (order.buyerId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
  if (order.paymentStatus === "payment_confirmed") {
    res.status(400).json({ error: "Cannot cancel after payment confirmed" }); return;
  }

  await db.update(marketplaceOrdersTable)
    .set({ shippingStatus: "cancelled", paymentStatus: "pending" })
    .where(eq(marketplaceOrdersTable.id, id));
  await db.update(marketplaceItemsTable)
    .set({ status: "available" })
    .where(eq(marketplaceItemsTable.id, order.itemId));

  await notify(order.sellerId, "❌ تم إلغاء الطلب",
    `تم إلغاء الطلب رقم #${id} — "${order.itemTitle}"`, "marketplace_order", id);

  res.sendStatus(204);
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — Marketplace Items
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/marketplace — all items
router.get("/admin/marketplace", ...adminGuard, async (_req, res): Promise<void> => {
  const items = await db.select({
    id: marketplaceItemsTable.id,
    sellerId: marketplaceItemsTable.sellerId,
    title: marketplaceItemsTable.title,
    price: marketplaceItemsTable.price,
    currency: marketplaceItemsTable.currency,
    category: marketplaceItemsTable.category,
    condition: marketplaceItemsTable.condition,
    images: marketplaceItemsTable.images,
    province: marketplaceItemsTable.province,
    city: marketplaceItemsTable.city,
    status: marketplaceItemsTable.status,
    isFeatured: marketplaceItemsTable.isFeatured,
    isHighlighted: marketplaceItemsTable.isHighlighted,
    isActive: marketplaceItemsTable.isActive,
    viewCount: marketplaceItemsTable.viewCount,
    createdAt: marketplaceItemsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(marketplaceItemsTable)
    .leftJoin(usersTable, eq(marketplaceItemsTable.sellerId, usersTable.id))
    .orderBy(desc(marketplaceItemsTable.createdAt))
    .limit(100);
  res.json(items);
});

// GET /admin/marketplace/pending — items awaiting review
router.get("/admin/marketplace/pending", ...adminGuard, async (_req, res): Promise<void> => {
  const items = await db.select({
    id: marketplaceItemsTable.id,
    sellerId: marketplaceItemsTable.sellerId,
    title: marketplaceItemsTable.title,
    description: marketplaceItemsTable.description,
    price: marketplaceItemsTable.price,
    currency: marketplaceItemsTable.currency,
    category: marketplaceItemsTable.category,
    condition: marketplaceItemsTable.condition,
    images: marketplaceItemsTable.images,
    province: marketplaceItemsTable.province,
    city: marketplaceItemsTable.city,
    status: marketplaceItemsTable.status,
    createdAt: marketplaceItemsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(marketplaceItemsTable)
    .leftJoin(usersTable, eq(marketplaceItemsTable.sellerId, usersTable.id))
    .where(eq(marketplaceItemsTable.status, "pending"))
    .orderBy(desc(marketplaceItemsTable.createdAt));
  res.json(items);
});

// PATCH /admin/marketplace/:id/status — approve or reject
router.patch("/admin/marketplace/:id/status", ...adminGuard, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { status } = req.body as { status: string };
  if (!["available", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be 'available' or 'rejected'" }); return;
  }
  const [updated] = await db.update(marketplaceItemsTable)
    .set({ status })
    .where(eq(marketplaceItemsTable.id, id))
    .returning({ id: marketplaceItemsTable.id, sellerId: marketplaceItemsTable.sellerId, title: marketplaceItemsTable.title, status: marketplaceItemsTable.status });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  // إشعار للبائع
  const notifTitle = status === "available" ? "تم قبول إعلانك ✅" : "تم رفض إعلانك ❌";
  const notifBody  = status === "available"
    ? `إعلانك "${updated.title}" تم قبوله ونشره على المنصة`
    : `إعلانك "${updated.title}" لم يُقبل من قِبَل الإدارة`;
  await notify(updated.sellerId, notifTitle, notifBody, "marketplace_status", updated.id);
  res.json(updated);
});

// DELETE /admin/marketplace/:id
router.delete("/admin/marketplace/:id", ...adminGuard, async (_req, res): Promise<void> => {
  const id = parseInt(_req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  res.sendStatus(204);
});

// PATCH /admin/marketplace/:id/feature
router.patch("/admin/marketplace/:id/feature", ...adminGuard, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { isFeatured, isHighlighted, isActive } = req.body as {
    isFeatured?: boolean; isHighlighted?: boolean; isActive?: boolean;
  };
  const updateData: { isFeatured?: boolean; isHighlighted?: boolean; isActive?: boolean } = {};
  if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
  if (isHighlighted !== undefined) updateData.isHighlighted = Boolean(isHighlighted);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (!Object.keys(updateData).length) { res.status(400).json({ error: "No fields" }); return; }
  const [updated] = await db.update(marketplaceItemsTable).set(updateData)
    .where(eq(marketplaceItemsTable.id, id)).returning({
      id: marketplaceItemsTable.id,
      isFeatured: marketplaceItemsTable.isFeatured,
      isHighlighted: marketplaceItemsTable.isHighlighted,
      isActive: marketplaceItemsTable.isActive,
    });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — Marketplace Orders
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/marketplace-orders
router.get("/admin/marketplace-orders", ...adminGuard, async (_req, res): Promise<void> => {
  const orders = await db.select({
    id: marketplaceOrdersTable.id,
    itemId: marketplaceOrdersTable.itemId,
    buyerId: marketplaceOrdersTable.buyerId,
    sellerId: marketplaceOrdersTable.sellerId,
    itemTitle: marketplaceOrdersTable.itemTitle,
    itemPrice: marketplaceOrdersTable.itemPrice,
    shippingCost: marketplaceOrdersTable.shippingCost,
    totalPrice: marketplaceOrdersTable.totalPrice,
    deliveryType: marketplaceOrdersTable.deliveryType,
    paymentStatus: marketplaceOrdersTable.paymentStatus,
    shippingStatus: marketplaceOrdersTable.shippingStatus,
    buyerName: marketplaceOrdersTable.buyerName,
    buyerPhone: marketplaceOrdersTable.buyerPhone,
    buyerAddress: marketplaceOrdersTable.buyerAddress,
    sellerAddress: marketplaceOrdersTable.sellerAddress,
    receiptImage: marketplaceOrdersTable.receiptImage,
    shamCashRef: marketplaceOrdersTable.shamCashRef,
    trackingNumber: marketplaceOrdersTable.trackingNumber,
    adminNotes: marketplaceOrdersTable.adminNotes,
    createdAt: marketplaceOrdersTable.createdAt,
    buyerDisplayName: usersTable.name,
    buyerDisplayPhone: usersTable.phone,
    itemImages: marketplaceItemsTable.images,
  })
    .from(marketplaceOrdersTable)
    .leftJoin(usersTable, eq(marketplaceOrdersTable.buyerId, usersTable.id))
    .leftJoin(marketplaceItemsTable, eq(marketplaceOrdersTable.itemId, marketplaceItemsTable.id))
    .orderBy(desc(marketplaceOrdersTable.createdAt))
    .limit(200);
  res.json(orders);
});

// PATCH /admin/marketplace-orders/:id/confirm-payment
router.patch("/admin/marketplace-orders/:id/confirm-payment", ...adminGuard, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [order] = await db.update(marketplaceOrdersTable)
    .set({ paymentStatus: "payment_confirmed", adminNotes: req.body.adminNotes || null })
    .where(eq(marketplaceOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  await notify(order.buyerId, "✅ تم تأكيد دفعتك",
    `تم تأكيد دفعتك للطلب #${id} — "${order.itemTitle}". سيتم تحضير الشحنة قريباً.`,
    "marketplace_order", id);
  await notify(order.sellerId, "💚 دفع مؤكد — حضّر الطلب",
    `تم تأكيد دفع الطلب #${id} — "${order.itemTitle}". يرجى تحضير السلعة للشحن.`,
    "marketplace_order", id);
  res.json(order);
});

// PATCH /admin/marketplace-orders/:id/reject-payment
router.patch("/admin/marketplace-orders/:id/reject-payment", ...adminGuard, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [order] = await db.update(marketplaceOrdersTable)
    .set({ paymentStatus: "payment_rejected", adminNotes: req.body.adminNotes || null })
    .where(eq(marketplaceOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  await notify(order.buyerId, "❌ لم يتم التحقق من الدفع",
    `لم يتم التحقق من إيصال الطلب #${id}. يرجى مراجعة إيصال الدفع وإعادة الرفع.`,
    "marketplace_order", id);
  res.json(order);
});

// PATCH /admin/marketplace-orders/:id/tracking — set tracking number
router.patch("/admin/marketplace-orders/:id/tracking", ...adminGuard, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { trackingNumber, shippingStatus } = req.body;
  if (!trackingNumber) { res.status(400).json({ error: "Tracking number required" }); return; }
  const [order] = await db.update(marketplaceOrdersTable)
    .set({
      trackingNumber,
      shippingStatus: shippingStatus || "in_transit",
    })
    .where(eq(marketplaceOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  await notify(order.buyerId, "🚚 شحنتك في الطريق!",
    `طلبك #${id} "${order.itemTitle}" — رقم التتبع: ${trackingNumber}`,
    "marketplace_order", id);
  res.json(order);
});

// PATCH /admin/marketplace-orders/:id/status
router.patch("/admin/marketplace-orders/:id/status", ...adminGuard, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { shippingStatus } = req.body;
  if (!shippingStatus) { res.status(400).json({ error: "Status required" }); return; }

  const [order] = await db.update(marketplaceOrdersTable)
    .set({ shippingStatus })
    .where(eq(marketplaceOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  if (shippingStatus === "delivered") {
    await db.update(marketplaceItemsTable)
      .set({ status: "sold" })
      .where(eq(marketplaceItemsTable.id, order.itemId));
    await notify(order.buyerId, "📦 تم تسليم طلبك",
      `تم تسليم "${order.itemTitle}" بنجاح!`, "marketplace_order", id);
    await notify(order.sellerId, "✅ تم تسليم الطلب",
      `تم تسليم "${order.itemTitle}" للمشتري بنجاح.`, "marketplace_order", id);
  }
  res.json(order);
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — Shipping Rates
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/shipping-rates
router.get("/admin/shipping-rates", ...adminGuard, async (_req, res): Promise<void> => {
  const rates = await db.select().from(shippingRatesTable)
    .orderBy(shippingRatesTable.fromProvince, shippingRatesTable.toProvince);
  res.json({ rates, provinces: SYRIAN_PROVINCES, defaultRate: 5000, sameCityRate: 2500 });
});

// PATCH /admin/shipping-rates — bulk upsert
router.patch("/admin/shipping-rates", ...adminGuard, async (req, res): Promise<void> => {
  const { updates } = req.body as {
    updates: Array<{ fromProvince: string; toProvince: string; rate: number }>;
  };
  if (!Array.isArray(updates)) { res.status(400).json({ error: "updates array required" }); return; }

  for (const u of updates) {
    if (!u.fromProvince || !u.toProvince || isNaN(Number(u.rate))) continue;
    const existing = await db.select({ id: shippingRatesTable.id })
      .from(shippingRatesTable)
      .where(and(
        eq(shippingRatesTable.fromProvince, u.fromProvince),
        eq(shippingRatesTable.toProvince, u.toProvince)
      ));
    if (existing.length > 0) {
      await db.update(shippingRatesTable)
        .set({ rate: String(u.rate) })
        .where(and(
          eq(shippingRatesTable.fromProvince, u.fromProvince),
          eq(shippingRatesTable.toProvince, u.toProvince)
        ));
    } else {
      await db.insert(shippingRatesTable).values({
        fromProvince: u.fromProvince,
        toProvince: u.toProvince,
        rate: String(u.rate),
      });
    }
  }

  res.json({ success: true });
});

// ── AI Description for marketplace listing ──────────────────────────────────
router.post("/marketplace/ai-description", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const description = await generateMarketplaceDescription(req.body);
    res.json({ description });
  } catch (err) {
    res.status(500).json({ error: "فشل توليد الوصف" });
  }
});

export default router;
