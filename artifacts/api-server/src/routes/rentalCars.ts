import { Router, type IRouter } from "express";
import { db, rentalCarsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/rental-cars", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: rentalCarsTable.id,
      sellerId: rentalCarsTable.sellerId,
      brand: rentalCarsTable.brand,
      model: rentalCarsTable.model,
      year: rentalCarsTable.year,
      city: rentalCarsTable.city,
      dailyPrice: rentalCarsTable.dailyPrice,
      weeklyPrice: rentalCarsTable.weeklyPrice,
      monthlyPrice: rentalCarsTable.monthlyPrice,
      description: rentalCarsTable.description,
      images: rentalCarsTable.images,
      createdAt: rentalCarsTable.createdAt,
      sellerName: usersTable.name,
      sellerPhone: usersTable.phone,
    })
    .from(rentalCarsTable)
    .leftJoin(usersTable, eq(rentalCarsTable.sellerId, usersTable.id))
    .orderBy(desc(rentalCarsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r,
      dailyPrice: r.dailyPrice ? Number(r.dailyPrice) : null,
      weeklyPrice: r.weeklyPrice ? Number(r.weeklyPrice) : null,
      monthlyPrice: r.monthlyPrice ? Number(r.monthlyPrice) : null,
    }))
  );
});

router.post("/rental-cars", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { brand, model, year, city, dailyPrice, weeklyPrice, monthlyPrice, description, images } = req.body;

  if (!brand || !model) {
    res.status(400).json({ error: "الشركة والموديل مطلوبان" });
    return;
  }

  const [created] = await db
    .insert(rentalCarsTable)
    .values({
      sellerId: req.user!.id,
      brand: brand as string,
      model: model as string,
      year: year ? Number(year) : null,
      city: city ?? null,
      dailyPrice: dailyPrice ? String(dailyPrice) : null,
      weeklyPrice: weeklyPrice ? String(weeklyPrice) : null,
      monthlyPrice: monthlyPrice ? String(monthlyPrice) : null,
      description: description ?? null,
      images: images ?? null,
    })
    .returning();

  res.status(201).json({ success: true, message: "تم نشر إعلان التأجير بنجاح", data: created });
});

router.delete("/rental-cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(rentalCarsTable).where(eq(rentalCarsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  if (row.sellerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(rentalCarsTable).where(eq(rentalCarsTable.id, id));
  res.json({ success: true });
});

export default router;
