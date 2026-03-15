/**
 * Marketplace Feed — MARKLET
 * GET /api/feed
 *
 * Returns ranked listings using the feedRanking service.
 * Supports optional ?category and ?limit query params.
 */
import { Router, type IRouter } from "express";
import { db, carsTable, imagesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { rankListings } from "../services/feedRanking.js";

const router: IRouter = Router();

router.get("/feed", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 40), 100);
    const category = req.query.category as string | undefined;

    const conditions = [
      eq(carsTable.isActive, true),
      eq(carsTable.status, "approved"),
    ] as ReturnType<typeof eq>[];

    if (category) {
      conditions.push(eq(carsTable.category, category) as any);
    }

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
             FROM images
             WHERE car_id = ${carsTable.id}),
            ARRAY[]::text[]
          )
        `,
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

export default router;
