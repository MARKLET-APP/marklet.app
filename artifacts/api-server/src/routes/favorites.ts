import { Router, type IRouter } from "express";
import { db, favoritesTable, carsTable, usersTable, imagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddFavoriteBody, RemoveFavoriteParams } from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/favorites", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const favs = await db.select({
    carId: favoritesTable.carId,
  }).from(favoritesTable).where(eq(favoritesTable.userId, req.userId!));

  const carIds = favs.map(f => f.carId);
  if (carIds.length === 0) {
    res.json([]);
    return;
  }

  const cars = await Promise.all(carIds.map(async (carId) => {
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
      viewCount: carsTable.viewCount,
      createdAt: carsTable.createdAt,
      sellerName: usersTable.name,
      sellerPhoto: usersTable.profilePhoto,
    })
      .from(carsTable)
      .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
      .where(eq(carsTable.id, carId));
    
    if (!car) return null;
    
    const [img] = await db.select().from(imagesTable).where(eq(imagesTable.carId, carId)).limit(1);
    
    return {
      ...car,
      price: Number(car.price),
      sellerName: car.sellerName ?? "Unknown",
      primaryImage: img?.imageUrl ?? null,
    };
  }));

  res.json(cars.filter(Boolean));
});

router.post("/favorites", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AddFavoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(favoritesTable)
    .where(and(eq(favoritesTable.userId, req.userId!), eq(favoritesTable.carId, parsed.data.carId)))
    .limit(1);
  
  if (existing.length > 0) {
    res.status(201).json(existing[0]);
    return;
  }

  const [fav] = await db.insert(favoritesTable).values({
    userId: req.userId!,
    carId: parsed.data.carId,
  }).returning();

  res.status(201).json(fav);
});

router.delete("/favorites/:carId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const params = RemoveFavoriteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, req.userId!), eq(favoritesTable.carId, params.data.carId)));
  
  res.sendStatus(204);
});

export default router;
