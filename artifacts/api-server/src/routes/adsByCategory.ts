/**
 * Smart Category Engine — LAZEMNI
 * GET /api/ads/:category
 *
 * Unified category filter endpoint.
 * Valid categories: cars, motorcycles, scrap, plates, parts, rental, suv, sedan, truck, van
 */
import { Router, type IRouter } from "express";
import { db, carsTable, imagesTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const CATEGORY_MAP: Record<string, string[]> = {
  cars:        ["sedan", "suv", "truck", "van"],
  motorcycles: ["motorcycle"],
  scrap:       ["scrap"],
  plates:      ["plates"],
  parts:       ["parts"],
  rental:      ["rental"],
  sedan:       ["sedan"],
  suv:         ["suv"],
  truck:       ["truck"],
  van:         ["van"],
};

router.get("/ads/:category", async (req, res): Promise<void> => {
  const { category } = req.params;
  const mappedCats = CATEGORY_MAP[category.toLowerCase()];

  if (!mappedCats) {
    res.status(400).json({
      error: `Unknown category: "${category}". Valid values: ${Object.keys(CATEGORY_MAP).join(", ")}`,
    });
    return;
  }

  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const ads = await db
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
      })
      .from(carsTable)
      .where(
        and(
          inArray(carsTable.category, mappedCats),
          eq(carsTable.isActive, true),
          eq(carsTable.status, "approved")
        )
      )
      .orderBy(desc(carsTable.isFeatured), desc(carsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(carsTable)
      .where(
        and(
          inArray(carsTable.category, mappedCats),
          eq(carsTable.isActive, true),
          eq(carsTable.status, "approved")
        )
      );

    res.json({ category, ads, total, page, limit });
  } catch (err) {
    console.error("[adsByCategory]", err);
    res.status(500).json({ error: "Server error loading ads" });
  }
});

export default router;
