import { Router, type IRouter } from "express";
import { db, carsTable, usersTable, imagesTable, favoritesTable, buyRequestsTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, desc, asc, sql, count, or } from "drizzle-orm";
import { CreateCarBody, UpdateCarBody, AddCarImageBody, ListCarsQueryParams } from "@workspace/api-zod";
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/cars", async (req, res): Promise<void> => {
  const query = ListCarsQueryParams.safeParse(req.query);
  
  const {
    brand, model, minYear, maxYear, minPrice, maxPrice,
    minMileage, maxMileage, province, city, fuelType,
    transmission, saleType, category, featured,
    page = 1, limit = 20, search, sortBy
  } = query.success ? query.data : {};

  const conditions = [
    eq(carsTable.isActive, true),
    or(
      eq(carsTable.status, "approved"),
      and(
        eq(carsTable.status, "sold"),
        sql`${carsTable.soldAt} > NOW() - INTERVAL '3 days'`
      )
    )!,
  ];
  
  if (brand) conditions.push(ilike(carsTable.brand, `%${brand}%`));
  if (model) conditions.push(ilike(carsTable.model, `%${model}%`));
  if (minYear) conditions.push(gte(carsTable.year, minYear));
  if (maxYear) conditions.push(lte(carsTable.year, maxYear));
  if (minPrice && maxPrice) conditions.push(sql`${carsTable.price}::numeric BETWEEN ${minPrice} AND ${maxPrice}`);
  else if (minPrice) conditions.push(gte(sql`${carsTable.price}::numeric`, minPrice));
  else if (maxPrice) conditions.push(lte(sql`${carsTable.price}::numeric`, maxPrice));
  if (minMileage) conditions.push(gte(carsTable.mileage, minMileage));
  if (maxMileage) conditions.push(lte(carsTable.mileage, maxMileage));
  if (province) conditions.push(eq(carsTable.province, province));
  if (city) conditions.push(ilike(carsTable.city, `%${city}%`));
  if (fuelType) conditions.push(eq(carsTable.fuelType, fuelType));
  if (transmission) conditions.push(eq(carsTable.transmission, transmission));
  if (saleType) conditions.push(eq(carsTable.saleType, saleType));
  if (category) conditions.push(eq(carsTable.category, category));
  if (featured) conditions.push(eq(carsTable.isFeatured, featured));
  const conditionFilter = (req.query as any).condition as string | undefined;
  if (conditionFilter) conditions.push(eq(carsTable.condition, conditionFilter));
  if (search) {
    conditions.push(
      or(
        ilike(carsTable.brand, `%${search}%`),
        ilike(carsTable.model, `%${search}%`),
        ilike(carsTable.description, `%${search}%`)
      )!
    );
  }

  const pageNum = page ?? 1;
  const limitNum = Math.min(limit ?? 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let orderBy;
  if (sortBy === "price_asc") orderBy = asc(sql`${carsTable.price}::numeric`);
  else if (sortBy === "price_desc") orderBy = desc(sql`${carsTable.price}::numeric`);
  else if (sortBy === "year_desc") orderBy = desc(carsTable.year);
  else if (sortBy === "mileage_asc") orderBy = asc(carsTable.mileage);
  else if (sortBy === "views") orderBy = desc(carsTable.viewCount);
  else orderBy = desc(carsTable.createdAt);

  const [totalResult] = await db.select({ count: count() })
    .from(carsTable)
    .where(and(...conditions));

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
    condition: carsTable.condition,
    category: carsTable.category,
    description: carsTable.description,
    isFeatured: carsTable.isFeatured,
    isHighlighted: carsTable.isHighlighted,
    isActive: carsTable.isActive,
    soldAt: carsTable.soldAt,
    viewCount: carsTable.viewCount,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhoto: usersTable.profilePhoto,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limitNum)
    .offset(offset);

  const carIds = cars.map(c => c.id);
  let primaryImages: Record<number, string | null> = {};
  
  if (carIds.length > 0) {
    const images = await db.select().from(imagesTable)
      .where(and(eq(imagesTable.isPrimary, true)));
    images.forEach(img => {
      if (carIds.includes(img.carId)) {
        primaryImages[img.carId] = img.imageUrl;
      }
    });
    
    for (const carId of carIds) {
      if (!(carId in primaryImages)) {
        const [firstImg] = await db.select().from(imagesTable)
          .where(eq(imagesTable.carId, carId)).limit(1);
        primaryImages[carId] = firstImg?.imageUrl ?? null;
      }
    }
  }

  res.json({
    cars: cars.map(c => ({
      ...c,
      price: Number(c.price),
      sellerName: c.sellerName ?? "Unknown",
      primaryImage: primaryImages[c.id] ?? null,
    })),
    total: Number(totalResult.count),
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/cars/featured", async (_req, res): Promise<void> => {
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
    soldAt: carsTable.soldAt,
    viewCount: carsTable.viewCount,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhoto: usersTable.profilePhoto,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .where(and(eq(carsTable.isFeatured, true), eq(carsTable.isActive, true)))
    .orderBy(desc(carsTable.createdAt))
    .limit(10);

  const enriched = await Promise.all(cars.map(async (c) => {
    const [img] = await db.select().from(imagesTable).where(eq(imagesTable.carId, c.id)).limit(1);
    return { ...c, price: Number(c.price), sellerName: c.sellerName ?? "Unknown", primaryImage: img?.imageUrl ?? null };
  }));

  res.json(enriched);
});

router.get("/cars/:id/similar", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, id)).limit(1);
  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  const similarCars = await db.select({
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
    soldAt: carsTable.soldAt,
    viewCount: carsTable.viewCount,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhoto: usersTable.profilePhoto,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .where(
      and(
        eq(carsTable.brand, car.brand),
        gte(sql`${carsTable.price}::numeric`, Number(car.price) - 2000),
        lte(sql`${carsTable.price}::numeric`, Number(car.price) + 2000),
        eq(carsTable.isActive, true),
        sql`${carsTable.id} != ${id}`
      )
    )
    .limit(6);

  const enriched = await Promise.all(similarCars.map(async (c) => {
    const [img] = await db.select().from(imagesTable).where(eq(imagesTable.carId, c.id)).limit(1);
    return { ...c, price: Number(c.price), sellerName: c.sellerName ?? "Unknown", primaryImage: img?.imageUrl ?? null };
  }));

  res.json(enriched);
});

router.get("/cars/:id", optionalAuthMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const [car] = await db.select({
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
    status: carsTable.status,
    viewCount: carsTable.viewCount,
    createdAt: carsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhoto: usersTable.profilePhoto,
    sellerPhone: usersTable.phone,
    sellerIsPremium: usersTable.isPremium,
    sellerIsVerified: usersTable.isVerified,
  })
    .from(carsTable)
    .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
    .where(eq(carsTable.id, id));

  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  if (car.status === "approved" || car.status === "sold") {
    await db.update(carsTable).set({ viewCount: car.viewCount + 1 }).where(eq(carsTable.id, id));
  }

  const images = await db.select().from(imagesTable).where(eq(imagesTable.carId, id));

  const requesterId = req.userId;
  const isSeller = requesterId === car.sellerId;
  const isAdmin = req.userRole === "admin";

  let requesterIsPremium = false;
  if (requesterId && !isSeller && !isAdmin) {
    const [requester] = await db.select({ isPremium: usersTable.isPremium, isVerified: usersTable.isVerified })
      .from(usersTable).where(eq(usersTable.id, requesterId)).limit(1);
    requesterIsPremium = !!(requester?.isPremium || requester?.isVerified);
  }

  const canSeePhone = isSeller || isAdmin || requesterIsPremium;

  res.json({
    ...car,
    price: Number(car.price),
    sellerName: car.sellerName ?? "Unknown",
    sellerRating: null,
    sellerPhone: canSeePhone ? car.sellerPhone : null,
    sellerIsPremium: undefined,
    sellerIsVerified: undefined,
    images,
  });
});

router.post("/cars/:id/sold", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid car ID" }); return; }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, id)).limit(1);
  if (!car) { res.status(404).json({ error: "Car not found" }); return; }
  if (car.sellerId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [updated] = await db.update(carsTable)
    .set({ status: "sold", isActive: true, soldAt: new Date() })
    .where(eq(carsTable.id, id)).returning();

  res.json({ ...updated, price: Number(updated.price) });
});

function validateImages(images: string[] | undefined): void {
  if (!images || images.length < 1) {
    throw new Error("يجب إضافة صورة واحدة على الأقل");
  }
}

router.post("/cars", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateCarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { images, ...carData } = parsed.data;

  try {
    validateImages(images);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  const condition = (req.body as any).condition as string | undefined;

  const [car] = await db.insert(carsTable).values({
    ...carData,
    sellerId: req.userId!,
    price: String(carData.price),
    ...(condition ? { condition } : {}),
  }).returning();

  if (images && images.length > 0) {
    await db.insert(imagesTable).values(
      images.map((url, idx) => ({
        carId: car.id,
        imageUrl: url,
        isPrimary: idx === 0,
      }))
    );
  }

  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  matchListing(car).catch(() => {});

  res.status(201).json({
    ...car,
    price: Number(car.price),
    sellerName: seller?.name ?? "Unknown",
    sellerPhoto: seller?.profilePhoto ?? null,
    primaryImage: images?.[0] ?? null,
  });
});

async function matchListing(listing: { brand: string; model: string; year: number; city: string; id: number }) {
  const matches = await db.select().from(buyRequestsTable).where(
    and(
      eq(buyRequestsTable.brand, listing.brand),
      eq(buyRequestsTable.model, listing.model),
      eq(buyRequestsTable.city, listing.city),
    )
  );
  if (matches.length > 0) {
    console.log(`[matchListing] Car #${listing.id} (${listing.brand} ${listing.model}) matched ${matches.length} buy request(s)`);
  }
}

router.patch("/cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, id)).limit(1);
  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  if (car.sellerId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateCarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.price !== undefined) updateData.price = String(updateData.price);

  if (req.userRole !== "admin") {
    updateData.status = "pending";
    updateData.isActive = false;
  }

  const [updated] = await db.update(carsTable).set(updateData).where(eq(carsTable.id, id)).returning();

  res.json({ ...updated, price: Number(updated.price) });
});

router.delete("/cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, id)).limit(1);
  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  if (car.sellerId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(carsTable).where(eq(carsTable.id, id));
  res.sendStatus(204);
});

// POST /api/cars/create alias
router.post("/cars/create", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateCarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { images, ...carData } = parsed.data;

  const [car] = await db.insert(carsTable).values({
    ...carData,
    sellerId: req.userId!,
    price: String(carData.price),
  }).returning();

  if (images && images.length > 0) {
    await db.insert(imagesTable).values(
      images.map((url, idx) => ({
        carId: car.id,
        imageUrl: url,
        isPrimary: idx === 0,
      }))
    );
  }

  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  res.status(201).json({
    ...car,
    price: Number(car.price),
    sellerName: seller?.name ?? "Unknown",
    sellerPhoto: seller?.profilePhoto ?? null,
    primaryImage: images?.[0] ?? null,
  });
});

// PUT /api/cars/:id alias
router.put("/cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, id)).limit(1);
  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  if (car.sellerId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateCarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.price !== undefined) updateData.price = String(updateData.price);

  const [updated] = await db.update(carsTable).set(updateData).where(eq(carsTable.id, id)).returning();

  res.json({ ...updated, price: Number(updated.price) });
});

router.post("/cars/:id/images", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const parsed = AddCarImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [img] = await db.insert(imagesTable).values({
    carId: id,
    imageUrl: parsed.data.imageUrl,
    isPrimary: parsed.data.isPrimary ?? false,
  }).returning();

  res.status(201).json(img);
});

router.post("/cars/:id/promote", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const [car] = await db.update(carsTable)
    .set({ isFeatured: true })
    .where(and(eq(carsTable.id, id), eq(carsTable.sellerId, req.userId!)))
    .returning();

  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  res.json({ ...car, price: Number(car.price) });
});

export default router;
