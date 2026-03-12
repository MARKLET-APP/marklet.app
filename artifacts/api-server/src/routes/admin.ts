import { Router, type IRouter } from "express";
import { db, usersTable, carsTable, imagesTable, settingsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { AdminUpdateUserBody, UpdateSettingsBody } from "@workspace/api-zod";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    profilePhoto: u.profilePhoto,
    province: u.province,
    city: u.city,
    isVerified: u.isVerified,
    isPremium: u.isPremium,
    createdAt: u.createdAt,
  })));
});

router.patch("/admin/users/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = AdminUpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.isVerified !== undefined) updateData.isVerified = parsed.data.isVerified;
  if (parsed.data.isPremium !== undefined) updateData.isPremium = parsed.data.isPremium;
  if (parsed.data.isBanned !== undefined) updateData.isBanned = parsed.data.isBanned;

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    profilePhoto: updated.profilePhoto,
    province: updated.province,
    city: updated.city,
    isVerified: updated.isVerified,
    isPremium: updated.isPremium,
    createdAt: updated.createdAt,
  });
});

router.delete("/admin/users/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/cars", async (_req, res): Promise<void> => {
  const cars = await db.select({
    id: carsTable.id,
    sellerId: carsTable.sellerId,
    brand: carsTable.brand,
    model: carsTable.model,
    year: carsTable.year,
    price: carsTable.price,
    mileage: carsTable.mileage,
    fuelType: carsTable.fuelType,
    transmission: carsTable.transmission,
    province: carsTable.province,
    city: carsTable.city,
    saleType: carsTable.saleType,
    category: carsTable.category,
    description: carsTable.description,
    isFeatured: carsTable.isFeatured,
    isHighlighted: carsTable.isHighlighted,
    isActive: carsTable.isActive,
    viewCount: carsTable.viewCount,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhoto: usersTable.profilePhoto,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .orderBy(desc(carsTable.createdAt));

  const [totalResult] = await db.select({ count: count() }).from(carsTable);

  res.json({
    cars: cars.map(c => ({ ...c, price: Number(c.price), sellerName: c.sellerName ?? "Unknown", primaryImage: null })),
    total: Number(totalResult.count),
    page: 1,
    limit: 1000,
  });
});

router.delete("/admin/cars/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(carsTable).where(eq(carsTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }
  res.json({
    ...settings,
    featuredListingPrice: Number(settings.featuredListingPrice),
    premiumSubscriptionPrice: Number(settings.premiumSubscriptionPrice),
  });
});

router.patch("/admin/settings", async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [existing] = await db.select().from(settingsTable).limit(1);
  
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.featuredListingPrice !== undefined) updateData.featuredListingPrice = String(updateData.featuredListingPrice);
  if (updateData.premiumSubscriptionPrice !== undefined) updateData.premiumSubscriptionPrice = String(updateData.premiumSubscriptionPrice);

  let updated;
  if (existing) {
    [updated] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, existing.id)).returning();
  } else {
    [updated] = await db.insert(settingsTable).values(updateData).returning();
  }

  res.json({
    ...updated,
    featuredListingPrice: Number(updated.featuredListingPrice),
    premiumSubscriptionPrice: Number(updated.premiumSubscriptionPrice),
  });
});

export default router;
