import { Router, type IRouter } from "express";
import { db, savedListingsTable, carsTable, carPartsTable, junkCarsTable, rentalCarsTable, buyRequestsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

async function getListingData(type: string, id: number) {
  if (type === "car_sale" || type === "motorcycles" || type === "plate_numbers") {
    const [row] = await db.select({
      id: carsTable.id,
      brand: carsTable.brand,
      model: carsTable.model,
      year: carsTable.year,
      price: carsTable.price,
      city: carsTable.city,
      sellerName: usersTable.name,
    }).from(carsTable).leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id)).where(eq(carsTable.id, id)).limit(1);
    if (!row) return null;
    const title = [row.brand, row.model, row.year].filter(Boolean).join(" ") || "سيارة";
    return { id: row.id, title, price: row.price ? Number(row.price) : null, city: row.city, sellerName: row.sellerName };
  }
  if (type === "car_rent") {
    const [row] = await db.select({
      id: rentalCarsTable.id,
      brand: rentalCarsTable.brand,
      model: rentalCarsTable.model,
      year: rentalCarsTable.year,
      city: rentalCarsTable.city,
      dailyPrice: rentalCarsTable.dailyPrice,
      images: rentalCarsTable.images,
    }).from(rentalCarsTable).where(eq(rentalCarsTable.id, id)).limit(1);
    if (!row) return null;
    return { id: row.id, title: [row.brand, row.model, row.year].filter(Boolean).join(" ") || "سيارة للإيجار", price: row.dailyPrice ? Number(row.dailyPrice) : null, city: row.city, images: row.images };
  }
  if (type === "car_parts") {
    const [row] = await db.select({
      id: carPartsTable.id,
      name: carPartsTable.name,
      price: carPartsTable.price,
      city: carPartsTable.city,
      images: carPartsTable.images,
    }).from(carPartsTable).where(eq(carPartsTable.id, id)).limit(1);
    if (!row) return null;
    return { id: row.id, title: row.name, price: row.price ? Number(row.price) : null, city: row.city, images: row.images };
  }
  if (type === "junk") {
    const [row] = await db.select({
      id: junkCarsTable.id,
      type: junkCarsTable.type,
      model: junkCarsTable.model,
      year: junkCarsTable.year,
      price: junkCarsTable.price,
      city: junkCarsTable.city,
      images: junkCarsTable.images,
    }).from(junkCarsTable).where(eq(junkCarsTable.id, id)).limit(1);
    if (!row) return null;
    return { id: row.id, title: [row.type, row.model, row.year].filter(Boolean).join(" ") || "سيارة معطوبة", price: row.price ? Number(row.price) : null, city: row.city, images: row.images };
  }
  if (type === "buy_request") {
    const [row] = await db.select({
      id: buyRequestsTable.id,
      brand: buyRequestsTable.brand,
      model: buyRequestsTable.model,
      minYear: buyRequestsTable.minYear,
      maxYear: buyRequestsTable.maxYear,
      maxPrice: buyRequestsTable.maxPrice,
      city: buyRequestsTable.city,
    }).from(buyRequestsTable).where(eq(buyRequestsTable.id, id)).limit(1);
    if (!row) return null;
    const title = [row.brand, row.model].filter(Boolean).join(" ") || "طلب شراء";
    return { id: row.id, title, price: row.maxPrice ? Number(row.maxPrice) : null, city: row.city };
  }
  if (type === "rent_request") {
    const [row] = await db.select({
      id: buyRequestsTable.id,
      brand: buyRequestsTable.brand,
      model: buyRequestsTable.model,
      maxPrice: buyRequestsTable.maxPrice,
      city: buyRequestsTable.city,
    }).from(buyRequestsTable).where(eq(buyRequestsTable.id, id)).limit(1);
    if (!row) return null;
    const title = [row.brand, row.model].filter(Boolean).join(" ") || "طلب استئجار";
    return { id: row.id, title, price: row.maxPrice ? Number(row.maxPrice) : null, city: row.city };
  }
  return null;
}

router.get("/saves", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(savedListingsTable).where(eq(savedListingsTable.userId, req.userId!));
  const results = await Promise.all(rows.map(async (r) => {
    const data = await getListingData(r.listingType, r.listingId);
    return { id: r.id, listingType: r.listingType, listingId: r.listingId, createdAt: r.createdAt, data };
  }));
  res.json(results.filter(r => r.data !== null));
});

router.get("/saves/ids", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db.select({
    listingType: savedListingsTable.listingType,
    listingId: savedListingsTable.listingId,
  }).from(savedListingsTable).where(eq(savedListingsTable.userId, req.userId!));
  res.json(rows);
});

router.post("/saves", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { listingType, listingId } = req.body;
  if (!listingType || !listingId) {
    res.status(400).json({ error: "listingType and listingId are required" });
    return;
  }
  const existing = await db.select().from(savedListingsTable)
    .where(and(
      eq(savedListingsTable.userId, req.userId!),
      eq(savedListingsTable.listingType, String(listingType)),
      eq(savedListingsTable.listingId, Number(listingId))
    )).limit(1);
  if (existing.length > 0) {
    res.status(201).json(existing[0]);
    return;
  }
  const [saved] = await db.insert(savedListingsTable).values({
    userId: req.userId!,
    listingType: String(listingType),
    listingId: Number(listingId),
  }).returning();
  res.status(201).json(saved);
});

router.delete("/saves/:listingType/:listingId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { listingType, listingId } = req.params;
  await db.delete(savedListingsTable)
    .where(and(
      eq(savedListingsTable.userId, req.userId!),
      eq(savedListingsTable.listingType, listingType),
      eq(savedListingsTable.listingId, Number(listingId))
    ));
  res.sendStatus(204);
});

export default router;
