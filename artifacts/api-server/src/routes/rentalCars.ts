import { Router, type IRouter } from "express";
import { db, rentalCarsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

/* GET all APPROVED rental cars (public). Admin sees all. */
router.get("/rental-cars", async (req: any, res): Promise<void> => {
  const isAdmin = req.user?.role === "admin";

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
      isApproved: rentalCarsTable.isApproved,
      createdAt: rentalCarsTable.createdAt,
      sellerName: usersTable.name,
      sellerPhone: usersTable.phone,
    })
    .from(rentalCarsTable)
    .leftJoin(usersTable, eq(rentalCarsTable.sellerId, usersTable.id))
    .where(isAdmin ? undefined : eq(rentalCarsTable.isApproved, true))
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

/* GET rental ads pending admin approval (admin only) */
router.get("/admin/rental-cars/pending", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

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
      isApproved: rentalCarsTable.isApproved,
      createdAt: rentalCarsTable.createdAt,
      sellerName: usersTable.name,
    })
    .from(rentalCarsTable)
    .leftJoin(usersTable, eq(rentalCarsTable.sellerId, usersTable.id))
    .where(eq(rentalCarsTable.isApproved, false))
    .orderBy(desc(rentalCarsTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    dailyPrice: r.dailyPrice ? Number(r.dailyPrice) : null,
    weeklyPrice: r.weeklyPrice ? Number(r.weeklyPrice) : null,
    monthlyPrice: r.monthlyPrice ? Number(r.monthlyPrice) : null,
  })));
});

/* PATCH approve/reject rental ad (admin) */
router.patch("/admin/rental-cars/:id/approve", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id, 10);
  const { approve } = req.body as { approve: boolean };
  if (typeof approve !== "boolean") { res.status(400).json({ error: "approve field (boolean) required" }); return; }

  if (!approve) {
    await db.delete(rentalCarsTable).where(eq(rentalCarsTable.id, id));
    res.json({ success: true, message: "تم رفض الإعلان وحذفه" });
    return;
  }

  const [updated] = await db
    .update(rentalCarsTable)
    .set({ isApproved: true })
    .where(eq(rentalCarsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, message: "تم قبول الإعلان ونشره", data: updated });
});

/* POST create rental car → pending approval */
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
      isApproved: false,
    })
    .returning();

  res.status(201).json({
    success: true,
    message: "تم استلام إعلانك وهو قيد مراجعة الإدارة، سيظهر بعد الموافقة",
    data: created,
  });
});

/* DELETE rental car */
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
