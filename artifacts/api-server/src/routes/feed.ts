/**
 * LAZEMNI — Unified Home Feed
 * GET /api/feed              → cars only (legacy)
 * GET /api/feed?unified=true → all sections, engagement-scored
 * GET /api/ads/featured      → featured ads from all sections
 */
import { Router, type IRouter } from "express";
import {
  db,
  carsTable,
  realEstateTable,
  jobsTable,
  marketplaceItemsTable,
  carPartsTable,
  junkCarsTable,
  rentalCarsTable,
  savedListingsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { rankListings } from "../services/feedRanking.js";

const router: IRouter = Router();

function daysSince(d: Date | string) {
  return (Date.now() - new Date(d).getTime()) / 86_400_000;
}

// ── GET /feed (legacy: cars only + unified mode) ──────────────────────────────
router.get("/feed", async (req, res): Promise<void> => {
  if (req.query.unified === "true") {
    await handleUnifiedFeed(req, res);
    return;
  }

  try {
    const limit = Math.min(Number(req.query.limit ?? 40), 100);
    const category = req.query.category as string | undefined;

    const conditions = [
      eq(carsTable.isActive, true),
      eq(carsTable.status, "approved"),
    ] as ReturnType<typeof eq>[];

    if (category) conditions.push(eq(carsTable.category, category) as any);

    const rows = await db
      .select({
        id: carsTable.id,
        brand: carsTable.brand,
        model: carsTable.model,
        year: carsTable.year,
        price: carsTable.price,
        mileage: carsTable.mileage,
        province: carsTable.province,
        city: carsTable.city,
        category: carsTable.category,
        condition: carsTable.condition,
        fuelType: carsTable.fuelType,
        transmission: carsTable.transmission,
        saleType: carsTable.saleType,
        description: carsTable.description,
        isFeatured: carsTable.isFeatured,
        isHighlighted: carsTable.isHighlighted,
        viewCount: carsTable.viewCount,
        createdAt: carsTable.createdAt,
        images: sql<string[]>`
          COALESCE(
            (SELECT array_agg(image_url ORDER BY is_primary DESC, id ASC)
             FROM images WHERE car_id = ${carsTable.id}),
            ARRAY[]::text[]
          )`,
      })
      .from(carsTable)
      .where(and(...conditions))
      .orderBy(desc(carsTable.isFeatured), desc(carsTable.createdAt))
      .limit(limit * 3);

    const ranked = rankListings(rows).slice(0, limit);
    res.json({ feed: ranked, total: ranked.length });
  } catch (err) {
    console.error("[feed]", err);
    res.status(500).json({ error: "Server error loading feed" });
  }
});

// ── GET /ads/featured ─────────────────────────────────────────────────────────
router.get("/ads/featured", async (_req, res): Promise<void> => {
  try {
    const [cars, reEstate, jobs, market] = await Promise.all([
      db.select({
        id: carsTable.id,
        title: sql<string>`CONCAT(${carsTable.brand}, ' ', ${carsTable.model}, ' ', ${carsTable.year})`,
        price: carsTable.price,
        province: carsTable.province,
        city: carsTable.city,
        createdAt: carsTable.createdAt,
        isFeatured: carsTable.isFeatured,
        sellerId: carsTable.sellerId,
        brand: carsTable.brand,
        model: carsTable.model,
        year: carsTable.year,
        category: carsTable.category,
        saleType: carsTable.saleType,
        condition: carsTable.condition,
        mileage: carsTable.mileage,
        fuelType: carsTable.fuelType,
        transmission: carsTable.transmission,
        images: sql<string[]>`
          COALESCE((SELECT array_agg(image_url ORDER BY is_primary DESC, id ASC)
            FROM images WHERE car_id = ${carsTable.id}), ARRAY[]::text[])`,
      })
        .from(carsTable)
        .where(and(eq(carsTable.isFeatured, true), eq(carsTable.status, "approved"), eq(carsTable.isActive, true)))
        .orderBy(desc(carsTable.createdAt))
        .limit(6),

      db.select({
        id: realEstateTable.id,
        title: realEstateTable.title,
        price: realEstateTable.price,
        province: realEstateTable.province,
        city: realEstateTable.city,
        createdAt: realEstateTable.createdAt,
        isFeatured: realEstateTable.isFeatured,
        sellerId: realEstateTable.sellerId,
        listingType: realEstateTable.listingType,
        subCategory: realEstateTable.subCategory,
        images: realEstateTable.images,
      })
        .from(realEstateTable)
        .where(and(eq(realEstateTable.isFeatured, true), eq(realEstateTable.status, "active"), eq(realEstateTable.isActive, true)))
        .orderBy(desc(realEstateTable.createdAt))
        .limit(4),

      db.select({
        id: jobsTable.id,
        title: jobsTable.title,
        province: jobsTable.province,
        city: jobsTable.city,
        createdAt: jobsTable.createdAt,
        isFeatured: jobsTable.isFeatured,
        posterId: jobsTable.posterId,
        subCategory: jobsTable.subCategory,
        salary: jobsTable.salary,
        salaryCurrency: jobsTable.salaryCurrency,
        company: jobsTable.company,
      })
        .from(jobsTable)
        .where(and(eq(jobsTable.isFeatured, true), eq(jobsTable.status, "active"), eq(jobsTable.isActive, true)))
        .orderBy(desc(jobsTable.createdAt))
        .limit(4),

      db.select({
        id: marketplaceItemsTable.id,
        title: marketplaceItemsTable.title,
        price: marketplaceItemsTable.price,
        province: marketplaceItemsTable.province,
        city: marketplaceItemsTable.city,
        createdAt: marketplaceItemsTable.createdAt,
        isFeatured: marketplaceItemsTable.isFeatured,
        sellerId: marketplaceItemsTable.sellerId,
        category: marketplaceItemsTable.category,
        condition: marketplaceItemsTable.condition,
        images: marketplaceItemsTable.images,
      })
        .from(marketplaceItemsTable)
        .where(and(eq(marketplaceItemsTable.isFeatured, true), eq(marketplaceItemsTable.status, "available"), eq(marketplaceItemsTable.isActive, true)))
        .orderBy(desc(marketplaceItemsTable.createdAt))
        .limit(4),
    ]);

    const mixed = [
      ...cars.map(c => ({ ...c, _type: "car" as const })),
      ...reEstate.map(r => ({ ...r, _type: "real_estate" as const })),
      ...jobs.map(j => ({ ...j, _type: "job" as const, price: null, images: [] as string[] })),
      ...market.map(m => ({ ...m, _type: "marketplace" as const })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(mixed);
  } catch (err) {
    console.error("[ads/featured]", err);
    res.status(500).json({ error: "Server error loading featured ads" });
  }
});

// ── Unified feed handler ──────────────────────────────────────────────────────
async function handleUnifiedFeed(req: any, res: any): Promise<void> {
  try {
    const PER = 20;
    const MAX = Math.min(Number(req.query.limit ?? 100), 100);

    const [cars, reEstate, jobs, market, parts, junk, rental] = await Promise.all([
      // Cars
      db.select({
        id: carsTable.id,
        title: sql<string>`CONCAT(${carsTable.brand}, ' ', ${carsTable.model}, ' ', ${carsTable.year})`,
        price: carsTable.price,
        province: carsTable.province,
        city: carsTable.city,
        createdAt: carsTable.createdAt,
        isFeatured: carsTable.isFeatured,
        sellerId: carsTable.sellerId,
        brand: carsTable.brand,
        model: carsTable.model,
        year: carsTable.year,
        category: carsTable.category,
        saleType: carsTable.saleType,
        condition: carsTable.condition,
        mileage: carsTable.mileage,
        fuelType: carsTable.fuelType,
        transmission: carsTable.transmission,
        images: sql<string[]>`COALESCE(
          (SELECT array_agg(image_url ORDER BY is_primary DESC, id ASC)
           FROM images WHERE car_id = ${carsTable.id}), ARRAY[]::text[])`,
      })
        .from(carsTable)
        .where(and(eq(carsTable.isActive, true), eq(carsTable.status, "approved")))
        .orderBy(desc(carsTable.createdAt)).limit(PER),

      // Real estate
      db.select({
        id: realEstateTable.id,
        title: realEstateTable.title,
        price: realEstateTable.price,
        province: realEstateTable.province,
        city: realEstateTable.city,
        createdAt: realEstateTable.createdAt,
        isFeatured: realEstateTable.isFeatured,
        sellerId: realEstateTable.sellerId,
        listingType: realEstateTable.listingType,
        subCategory: realEstateTable.subCategory,
        images: realEstateTable.images,
      })
        .from(realEstateTable)
        .where(and(eq(realEstateTable.status, "active"), eq(realEstateTable.isActive, true)))
        .orderBy(desc(realEstateTable.createdAt)).limit(PER),

      // Jobs
      db.select({
        id: jobsTable.id,
        title: jobsTable.title,
        province: jobsTable.province,
        city: jobsTable.city,
        createdAt: jobsTable.createdAt,
        isFeatured: jobsTable.isFeatured,
        posterId: jobsTable.posterId,
        subCategory: jobsTable.subCategory,
        salary: jobsTable.salary,
        salaryCurrency: jobsTable.salaryCurrency,
        company: jobsTable.company,
      })
        .from(jobsTable)
        .where(and(eq(jobsTable.status, "active"), eq(jobsTable.isActive, true)))
        .orderBy(desc(jobsTable.createdAt)).limit(PER),

      // Marketplace
      db.select({
        id: marketplaceItemsTable.id,
        title: marketplaceItemsTable.title,
        price: marketplaceItemsTable.price,
        province: marketplaceItemsTable.province,
        city: marketplaceItemsTable.city,
        createdAt: marketplaceItemsTable.createdAt,
        isFeatured: marketplaceItemsTable.isFeatured,
        sellerId: marketplaceItemsTable.sellerId,
        category: marketplaceItemsTable.category,
        condition: marketplaceItemsTable.condition,
        images: marketplaceItemsTable.images,
      })
        .from(marketplaceItemsTable)
        .where(and(eq(marketplaceItemsTable.status, "available"), eq(marketplaceItemsTable.isActive, true)))
        .orderBy(desc(marketplaceItemsTable.createdAt)).limit(PER),

      // Car parts
      db.select({
        id: carPartsTable.id,
        title: carPartsTable.name,
        price: carPartsTable.price,
        province: sql<string>`null`,
        city: carPartsTable.city,
        createdAt: carPartsTable.createdAt,
        sellerId: carPartsTable.sellerId,
        condition: carPartsTable.condition,
        images: carPartsTable.images,
      })
        .from(carPartsTable)
        .where(eq(carPartsTable.status, "approved"))
        .orderBy(desc(carPartsTable.createdAt)).limit(PER),

      // Junk cars
      db.select({
        id: junkCarsTable.id,
        title: sql<string>`COALESCE(CONCAT(${junkCarsTable.type}, ' ', ${junkCarsTable.model}), 'سيارة حوادث')`,
        price: junkCarsTable.price,
        province: sql<string>`null`,
        city: junkCarsTable.city,
        createdAt: junkCarsTable.createdAt,
        sellerId: junkCarsTable.sellerId,
        condition: junkCarsTable.condition,
        images: junkCarsTable.images,
      })
        .from(junkCarsTable)
        .where(eq(junkCarsTable.status, "approved"))
        .orderBy(desc(junkCarsTable.createdAt)).limit(PER),

      // Rental cars
      db.select({
        id: rentalCarsTable.id,
        title: sql<string>`CONCAT(${rentalCarsTable.brand}, ' ', ${rentalCarsTable.model})`,
        price: rentalCarsTable.dailyPrice,
        province: sql<string>`null`,
        city: rentalCarsTable.city,
        createdAt: rentalCarsTable.createdAt,
        sellerId: rentalCarsTable.sellerId,
        brand: rentalCarsTable.brand,
        model: rentalCarsTable.model,
        images: rentalCarsTable.images,
      })
        .from(rentalCarsTable)
        .where(eq(rentalCarsTable.isApproved, true))
        .orderBy(desc(rentalCarsTable.createdAt)).limit(PER),
    ]);

    type RawItem = { id: number; _type: string; createdAt: Date | string; isFeatured?: boolean | null; [key: string]: any };

    const allItems: RawItem[] = [
      ...cars.map(c => ({ ...c, _type: "car", isFeatured: c.isFeatured ?? false })),
      ...reEstate.map(r => ({ ...r, _type: "real_estate", isFeatured: r.isFeatured ?? false })),
      ...jobs.map(j => ({ ...j, _type: "job", price: null, images: [] as string[], isFeatured: j.isFeatured ?? false })),
      ...market.map(m => ({ ...m, _type: "marketplace", isFeatured: m.isFeatured ?? false })),
      ...parts.map(p => ({ ...p, _type: "car_part", isFeatured: false })),
      ...junk.map(j => ({ ...j, _type: "junk_car", isFeatured: false })),
      ...rental.map(r => ({ ...r, _type: "rental_car", isFeatured: false })),
    ];

    // Get save counts for all items in one query
    const saveMap = new Map<string, number>();
    const savedRows = await db
      .select({
        listingType: savedListingsTable.listingType,
        listingId: savedListingsTable.listingId,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(savedListingsTable)
      .groupBy(savedListingsTable.listingType, savedListingsTable.listingId);

    for (const row of savedRows) {
      saveMap.set(`${row.listingType}:${row.listingId}`, Number(row.cnt));
    }

    // Score: featured(+15) + saves(×2) + recency(max 30 – 1/day)
    const scored = allItems.map(item => {
      const saves = saveMap.get(`${item._type}:${item.id}`) ?? 0;
      const ageDays = daysSince(item.createdAt);
      const recency = Math.max(0, 30 - ageDays);
      const score = (item.isFeatured ? 15 : 0) + saves * 2 + recency;
      return { ...item, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    const result = scored.slice(0, MAX);

    res.json({ feed: result, total: result.length });
  } catch (err) {
    console.error("[feed/unified]", err);
    res.status(500).json({ error: "Server error loading unified feed" });
  }
}

export default router;
