import { Router, type IRouter } from "express";
import { db, carsTable, usersTable, imagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GenerateCarDescriptionBody, EstimatePriceBody, GetRecommendationsQueryParams } from "@workspace/api-zod";
import { generateCarDescription, estimateCarPrice } from "../lib/openai.js";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/ai/generate-description", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GenerateCarDescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const description = await generateCarDescription(parsed.data);
  res.json({ description });
});

router.post("/ai/estimate-price", async (req, res): Promise<void> => {
  const parsed = EstimatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const estimate = await estimateCarPrice(parsed.data);
  res.json({ ...estimate, currency: "USD" });
});

router.get("/ai/recommendations", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const query = GetRecommendationsQueryParams.safeParse(req.query);
  const province = query.success ? query.data.province : undefined;

  let carsQuery = db.select({
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
    .where(eq(carsTable.isActive, true))
    .orderBy(desc(carsTable.viewCount))
    .limit(10);

  const cars = await carsQuery;

  const enriched = await Promise.all(cars.map(async (c) => {
    const [img] = await db.select().from(imagesTable).where(eq(imagesTable.carId, c.id)).limit(1);
    return { ...c, price: Number(c.price), sellerName: c.sellerName ?? "Unknown", primaryImage: img?.imageUrl ?? null };
  }));

  res.json(enriched);
});

export default router;
