import { Router, type IRouter } from "express";
import { db, usersTable, carsTable, settingsTable, missingCarsTable, imagesTable, conversationsTable, messagesTable, notificationsTable, junkCarsTable, buyRequestsTable, inspectionCentersTable, scrapCentersTable, showroomsTable } from "@workspace/db";
import { eq, desc, count, sql, ilike, or } from "drizzle-orm";
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
    subscriptionActive: u.subscriptionActive,
    isBanned: u.isBanned,
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
  if (parsed.data.subscriptionActive !== undefined) updateData.subscriptionActive = parsed.data.subscriptionActive;

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
    subscriptionActive: updated.subscriptionActive,
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
      condition: null,
      color: null,
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
    status: carsTable.status,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .orderBy(desc(carsTable.createdAt))
    .limit(50);

  // Fetch images for all cars (primary first)
  const allImages = cars.length > 0
    ? await db.select({
        carId: imagesTable.carId,
        imageUrl: imagesTable.imageUrl,
      }).from(imagesTable).orderBy(sql`is_primary DESC`)
    : [];
  const imagesByCarId = new Map<number, string[]>();
  for (const img of allImages) {
    if (!imagesByCarId.has(img.carId)) imagesByCarId.set(img.carId, []);
    imagesByCarId.get(img.carId)!.push(img.imageUrl);
  }

  const [totalResult] = await db.select({ count: count() }).from(carsTable);

  res.json({
    cars: cars.map(c => {
      const imgs = imagesByCarId.get(c.id) ?? [];
      return {
        ...c,
        price: Number(c.price),
        condition: null,
        color: null,
        sellerName: c.sellerName ?? "مجهول",
        sellerPhone: c.sellerPhone ?? null,
        primaryImage: imgs[0] ?? null,
        images: imgs,
      };
    }),
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

  const [car] = await db.select({ id: carsTable.id, sellerId: carsTable.sellerId, brand: carsTable.brand, model: carsTable.model }).from(carsTable).where(eq(carsTable.id, id));
  if (!car) { res.status(404).json({ error: "Car not found" }); return; }

  const [updated] = await db.update(carsTable).set({ status }).where(eq(carsTable.id, id)).returning({ id: carsTable.id, status: carsTable.status });

  if (status === "approved" && car.sellerId) {
    await db.insert(notificationsTable).values({
      userId: car.sellerId,
      type: "approval",
      message: `تمت الموافقة على إعلانك "${car.brand ?? ""} ${car.model ?? ""}".  تم نشره الآن في MARKLET.`,
      link: `/cars/${car.id}`,
    }).catch(() => {});
  } else if (status === "rejected" && car.sellerId) {
    await db.insert(notificationsTable).values({
      userId: car.sellerId,
      type: "rejection",
      message: `تم رفض إعلانك "${car.brand ?? ""} ${car.model ?? ""}". يمكنك تعديله وإعادة إرساله.`,
      link: `/cars/${car.id}`,
    }).catch(() => {});
  }

  res.json(updated);
});

router.post("/admin/approve/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db.update(carsTable).set({ status: "approved" }).where(eq(carsTable.id, id)).returning({ id: carsTable.id, status: carsTable.status });
  if (!updated) { res.status(404).json({ error: "Car not found" }); return; }

  res.send("approved");
});

router.patch("/admin/cars/:id/feature", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { isFeatured, isHighlighted, isActive } = req.body as {
    isFeatured?: boolean; isHighlighted?: boolean; isActive?: boolean;
  };
  const updateData: Record<string, boolean> = {};
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  if (isHighlighted !== undefined) updateData.isHighlighted = isHighlighted;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (!Object.keys(updateData).length) { res.status(400).json({ error: "No fields to update" }); return; }
  const [updated] = await db.update(carsTable).set(updateData).where(eq(carsTable.id, id)).returning({
    id: carsTable.id, isFeatured: carsTable.isFeatured, isHighlighted: carsTable.isHighlighted, isActive: carsTable.isActive,
  });
  if (!updated) { res.status(404).json({ error: "Car not found" }); return; }
  res.json(updated);
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

// Link / unlink a car to a showroom
router.patch("/admin/cars/:id/showroom", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const showroomId = req.body.showroomId != null ? Number(req.body.showroomId) : null;
  const [updated] = await db
    .update(carsTable)
    .set({ showroomId: showroomId || null })
    .where(eq(carsTable.id, id))
    .returning({ id: carsTable.id, showroomId: carsTable.showroomId });
  res.json(updated);
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

router.get("/admin/conversations", ...guard, async (_req, res): Promise<void> => {
  const convs = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt)).limit(200);
  if (!convs.length) { res.json([]); return; }

  const userIds = [...new Set(convs.flatMap((c) => [c.buyerId, c.sellerId]))];
  const carIds = [...new Set(convs.map((c) => c.carId))];

  const [users, cars, lastMsgs] = await Promise.all([
    db.select({ id: usersTable.id, name: usersTable.name, profilePhoto: usersTable.profilePhoto })
      .from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`),
    db.select({ id: carsTable.id, brand: carsTable.brand, model: carsTable.model, year: carsTable.year })
      .from(carsTable).where(sql`${carsTable.id} = ANY(ARRAY[${sql.join(carIds.map(id => sql`${id}`), sql`, `)}]::int[])`),
    Promise.all(convs.map((c) =>
      db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, c.id))
        .orderBy(desc(messagesTable.createdAt)).limit(1)
    )),
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const carMap = Object.fromEntries(cars.map((c) => [c.id, c]));

  const result = convs.map((conv, i) => {
    const buyer = userMap[conv.buyerId];
    const seller = userMap[conv.sellerId];
    const car = carMap[conv.carId];
    const last = lastMsgs[i]?.[0];
    return {
      id: conv.id,
      carId: conv.carId,
      carBrand: car?.brand ?? "—",
      carModel: car?.model ?? "—",
      carYear: car?.year ?? 0,
      buyerId: conv.buyerId,
      buyerName: buyer?.name ?? "مجهول",
      buyerPhoto: buyer?.profilePhoto ?? null,
      sellerId: conv.sellerId,
      sellerName: seller?.name ?? "مجهول",
      sellerPhoto: seller?.profilePhoto ?? null,
      lastMessage: last?.isDeleted ? "تم حذف الرسالة" : (last?.content ?? null),
      lastMessageAt: last?.createdAt ?? null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  });

  res.json(result);
});

router.get("/admin/junk-cars", ...guard, async (_req, res): Promise<void> => {
  const junkCars = await db
    .select({
      id: junkCarsTable.id,
      sellerId: junkCarsTable.sellerId,
      type: junkCarsTable.type,
      model: junkCarsTable.model,
      year: junkCarsTable.year,
      condition: junkCarsTable.condition,
      price: junkCarsTable.price,
      city: junkCarsTable.city,
      images: junkCarsTable.images,
      description: junkCarsTable.description,
      createdAt: junkCarsTable.createdAt,
      sellerName: usersTable.name,
      sellerPhone: usersTable.phone,
    })
    .from(junkCarsTable)
    .leftJoin(usersTable, eq(junkCarsTable.sellerId, usersTable.id))
    .orderBy(desc(junkCarsTable.createdAt))
    .limit(100);
  res.json(junkCars);
});

router.delete("/admin/junk-cars/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(junkCarsTable).where(eq(junkCarsTable.id, id));
  res.json({ success: true });
});

// ─── Enhanced Dashboard Stats ──────────────────────────────────────────────
router.get("/admin/stats", ...guard, async (_req, res): Promise<void> => {
  const [[usersCount], [dealersCount], [listingsCount], [inspectionCount], [scrapCount], [showroomsCount]] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "dealer")),
    db.select({ count: count() }).from(carsTable),
    db.select({ count: count() }).from(inspectionCentersTable),
    db.select({ count: count() }).from(scrapCentersTable),
    db.select({ count: count() }).from(showroomsTable),
  ]);
  res.json({
    totalUsers: usersCount.count,
    totalDealers: dealersCount.count,
    totalListings: listingsCount.count,
    totalInspectionCenters: inspectionCount.count,
    totalScrapCenters: scrapCount.count,
    totalShowrooms: showroomsCount.count,
  });
});

// ─── Dealers Management (users with role=dealer) ───────────────────────────
router.get("/admin/dealers", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const q = req.query.q as string | undefined;
  let query = db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    phone: usersTable.phone, whatsapp: usersTable.whatsapp, role: usersTable.role,
    isVerified: usersTable.isVerified, isFeaturedSeller: usersTable.isFeaturedSeller,
    showroomName: usersTable.showroomName, showroomAddress: usersTable.showroomAddress,
    showroomPhone: usersTable.showroomPhone, showroomPhoto: usersTable.showroomPhoto,
    city: usersTable.city, createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.role, "dealer")).$dynamic();
  const dealers = await query.orderBy(desc(usersTable.createdAt)).limit(100);
  res.json(q ? dealers.filter(d => d.name?.includes(q) || d.phone?.includes(q) || d.showroomName?.includes(q)) : dealers);
});

router.patch("/admin/dealers/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { isVerified, isFeaturedSeller, showroomName, showroomAddress, showroomPhone } = req.body;
  const updateData: Record<string, unknown> = {};
  if (isVerified !== undefined) updateData.isVerified = isVerified;
  if (isFeaturedSeller !== undefined) updateData.isFeaturedSeller = isFeaturedSeller;
  if (showroomName !== undefined) updateData.showroomName = showroomName;
  if (showroomAddress !== undefined) updateData.showroomAddress = showroomAddress;
  if (showroomPhone !== undefined) updateData.showroomPhone = showroomPhone;
  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

router.patch("/admin/users/:id/promote-dealer", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [updated] = await db.update(usersTable).set({ role: "dealer", isVerified: true }).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

router.patch("/admin/users/:id/featured-seller", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { isFeaturedSeller } = req.body;
  const [updated] = await db.update(usersTable).set({ isFeaturedSeller: !!isFeaturedSeller }).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

// ─── Inspection Centers Admin ──────────────────────────────────────────────
router.get("/admin/inspection-centers", ...guard, async (_req, res): Promise<void> => {
  const centers = await db.select().from(inspectionCentersTable).orderBy(desc(inspectionCentersTable.createdAt)).limit(100);
  res.json(centers);
});

router.post("/admin/inspection-centers", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const { name, city, address, phone, whatsapp, description } = req.body;
  if (!name || !city) { res.status(400).json({ error: "name and city are required" }); return; }
  const [center] = await db.insert(inspectionCentersTable).values({ name, city, address, phone, whatsapp, description }).returning();
  res.json(center);
});

router.patch("/admin/inspection-centers/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, city, address, phone, whatsapp, description, isVerified, isFeatured } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (city !== undefined) updateData.city = city;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
  if (description !== undefined) updateData.description = description;
  if (isVerified !== undefined) updateData.isVerified = isVerified;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  const [updated] = await db.update(inspectionCentersTable).set(updateData).where(eq(inspectionCentersTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/inspection-centers/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(inspectionCentersTable).where(eq(inspectionCentersTable.id, id));
  res.json({ success: true });
});

// ─── Scrap Centers Admin ───────────────────────────────────────────────────
router.get("/admin/scrap-centers", ...guard, async (_req, res): Promise<void> => {
  const centers = await db.select().from(scrapCentersTable).orderBy(desc(scrapCentersTable.createdAt)).limit(100);
  res.json(centers);
});

router.post("/admin/scrap-centers", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const { name, city, address, phone, whatsapp, description } = req.body;
  if (!name || !city) { res.status(400).json({ error: "name and city are required" }); return; }
  const [center] = await db.insert(scrapCentersTable).values({ name, city, address, phone, whatsapp, description }).returning();
  res.json(center);
});

router.patch("/admin/scrap-centers/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, city, address, phone, whatsapp, description, isVerified, isFeatured } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (city !== undefined) updateData.city = city;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
  if (description !== undefined) updateData.description = description;
  if (isVerified !== undefined) updateData.isVerified = isVerified;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  const [updated] = await db.update(scrapCentersTable).set(updateData).where(eq(scrapCentersTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/scrap-centers/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(scrapCentersTable).where(eq(scrapCentersTable.id, id));
  res.json({ success: true });
});

// ─── Showrooms Admin ───────────────────────────────────────────────────────
router.get("/admin/showrooms", ...guard, async (_req, res): Promise<void> => {
  const showrooms = await db
    .select({
      id: showroomsTable.id, name: showroomsTable.name, city: showroomsTable.city,
      phone: showroomsTable.phone, whatsapp: showroomsTable.whatsapp, email: showroomsTable.email,
      logo: showroomsTable.logo, coverImage: showroomsTable.coverImage, description: showroomsTable.description,
      isVerified: showroomsTable.isVerified, isFeatured: showroomsTable.isFeatured,
      isSuspended: showroomsTable.isSuspended, ownerUserId: showroomsTable.ownerUserId,
      address: showroomsTable.address, rating: showroomsTable.rating, createdAt: showroomsTable.createdAt,
      ownerName: usersTable.name, ownerPhone: usersTable.phone,
    })
    .from(showroomsTable)
    .leftJoin(usersTable, eq(showroomsTable.ownerUserId, usersTable.id))
    .orderBy(desc(showroomsTable.createdAt))
    .limit(100);
  res.json(showrooms);
});

router.post("/admin/showrooms", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const { name, city, address, phone, whatsapp, email, description, ownerUserId } = req.body;
  if (!name || !city) { res.status(400).json({ error: "name and city are required" }); return; }
  const [showroom] = await db.insert(showroomsTable).values({ name, city, address, phone, whatsapp, email, description, ownerUserId: ownerUserId || null }).returning();
  res.json(showroom);
});

router.patch("/admin/showrooms/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { name, city, address, phone, whatsapp, email, description, isVerified, isFeatured, isSuspended, ownerUserId } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (city !== undefined) updateData.city = city;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
  if (email !== undefined) updateData.email = email;
  if (description !== undefined) updateData.description = description;
  if (ownerUserId !== undefined) updateData.ownerUserId = ownerUserId || null;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  if (isSuspended !== undefined) updateData.isSuspended = isSuspended;
  if (isVerified !== undefined) {
    updateData.isVerified = isVerified;
    // When verifying a showroom, promote its owner to dealer
    if (isVerified && ownerUserId) {
      await db.update(usersTable).set({ role: "dealer", isVerified: true }).where(eq(usersTable.id, ownerUserId));
    }
  }
  const [updated] = await db.update(showroomsTable).set(updateData).where(eq(showroomsTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/showrooms/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(showroomsTable).where(eq(showroomsTable.id, id));
  res.json({ success: true });
});

// Link showroom to a user (by email or phone lookup)
router.post("/admin/showrooms/:id/link-user", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { email, phone } = req.body;
  if (!email && !phone) { res.status(400).json({ error: "email or phone required" }); return; }
  
  let user = null;
  if (email) {
    [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  } else if (phone) {
    [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  }
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const [updated] = await db.update(showroomsTable).set({ ownerUserId: user.id }).where(eq(showroomsTable.id, id)).returning();
  // Promote to dealer if showroom is verified
  if (updated.isVerified) {
    await db.update(usersTable).set({ role: "dealer", isVerified: true }).where(eq(usersTable.id, user.id));
  }
  res.json({ showroom: updated, user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
