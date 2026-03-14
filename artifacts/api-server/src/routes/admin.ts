import { Router, type IRouter } from "express";
import { db, usersTable, carsTable, settingsTable, missingCarsTable, imagesTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { AdminUpdateUserBody, UpdateSettingsBody } from "@workspace/api-zod";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const guard = [authMiddleware, adminMiddleware];

router.get("/admin/dashboard", ...guard, async (_req, res): Promise<void> => {
  const [[usersCount], [listingsCount], [missingCarsCount]] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(carsTable),
    db.select({ count: count() }).from(missingCarsTable),
  ]);
  res.json({
    usersCount: Number(usersCount.count),
    listingsCount: Number(listingsCount.count),
    missingCarsCount: Number(missingCarsCount.count),
  });
});

router.get("/admin/users", ...guard, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(50);
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

router.patch("/admin/users/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
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

router.delete("/admin/users/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/pending-cars", ...guard, async (_req, res): Promise<void> => {
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
    condition: carsTable.condition,
    color: carsTable.color,
    description: carsTable.description,
    city: carsTable.city,
    province: carsTable.province,
    saleType: carsTable.saleType,
    category: carsTable.category,
    status: carsTable.status,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .where(eq(carsTable.status, "pending"))
    .orderBy(desc(carsTable.createdAt));

  // Fetch ALL images for all pending cars (primary first)
  const allImages = cars.length > 0
    ? await db.select({
        carId: imagesTable.carId,
        imageUrl: imagesTable.imageUrl,
      }).from(imagesTable).orderBy(sql`is_primary DESC`)
    : [];
  // Group images by carId
  const imagesByCarId = new Map<number, string[]>();
  for (const img of allImages) {
    if (!imagesByCarId.has(img.carId)) imagesByCarId.set(img.carId, []);
    imagesByCarId.get(img.carId)!.push(img.imageUrl);
  }

  res.json(cars.map(c => {
    const imgs = imagesByCarId.get(c.id) ?? [];
    return {
      ...c,
      price: Number(c.price),
      sellerName: c.sellerName ?? "مجهول",
      primaryImage: imgs[0] ?? null,
      images: imgs,
    };
  }));
});

router.get("/admin/cars", ...guard, async (_req, res): Promise<void> => {
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
    .orderBy(desc(carsTable.createdAt))
    .limit(50);

  const [totalResult] = await db.select({ count: count() }).from(carsTable);

  res.json({
    cars: cars.map(c => ({ ...c, price: Number(c.price), sellerName: c.sellerName ?? "Unknown", primaryImage: null })),
    total: Number(totalResult.count),
    page: 1,
    limit: 1000,
  });
});

router.patch("/admin/cars/:id/status", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be pending | approved | rejected" });
    return;
  }

  const [updated] = await db.update(carsTable).set({ status }).where(eq(carsTable.id, id)).returning({ id: carsTable.id, status: carsTable.status });
  if (!updated) { res.status(404).json({ error: "Car not found" }); return; }

  res.json(updated);
});

router.post("/admin/approve/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db.update(carsTable).set({ status: "approved" }).where(eq(carsTable.id, id)).returning({ id: carsTable.id, status: carsTable.status });
  if (!updated) { res.status(404).json({ error: "Car not found" }); return; }

  res.send("approved");
});

router.delete("/admin/cars/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(carsTable).where(eq(carsTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/settings", ...guard, async (_req, res): Promise<void> => {
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

router.patch("/admin/settings", ...guard, async (req: AuthRequest, res): Promise<void> => {
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
