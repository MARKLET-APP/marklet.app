import { Router, type IRouter } from "express";
import { db, inspectionCentersTable, inspectionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, inspectorMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/inspection-centers", async (_req, res): Promise<void> => {
  const centers = await db.select().from(inspectionCentersTable).orderBy(desc(inspectionCentersTable.rating));
  res.json(centers.map(c => ({ ...c, rating: Number(c.rating) })));
});

router.post("/inspection-centers", authMiddleware, inspectorMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { name, city, contact, rating } = req.body;
  const [created] = await db.insert(inspectionCentersTable).values({
    name, city,
    contact: contact ?? null,
    rating: rating ? String(rating) : "0",
  }).returning();
  res.status(201).json(created);
});

router.post("/inspections", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { carId, centerId, date, coveragePoints } = req.body;
  if (!centerId || !date) { res.status(400).json({ error: "centerId and date are required" }); return; }

  const [created] = await db.insert(inspectionsTable).values({
    userId: String(req.user!.id),
    carId: carId ? String(carId) : null,
    centerId: String(centerId),
    date: new Date(date),
    coveragePoints: coveragePoints ? String(coveragePoints) : null,
  }).returning();

  res.status(201).json({ success: true, message: "تم حجز موعد الفحص بنجاح", data: created });
});

router.get("/inspections/mine", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(inspectionsTable)
    .where(eq(inspectionsTable.userId, String(req.user!.id)))
    .orderBy(desc(inspectionsTable.createdAt));
  res.json(rows);
});

export default router;
