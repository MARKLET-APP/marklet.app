import { Router, type IRouter } from "express";
import { db, inspectionCentersTable, inspectionsTable } from "@workspace/db";
import { eq, desc, or, ilike } from "drizzle-orm";
import { authMiddleware, inspectorMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

/* GET all inspection centers with optional search */
router.get("/inspection-centers", async (req, res): Promise<void> => {
  const q = (req.query.q as string) || "";
  const query = db.select().from(inspectionCentersTable).orderBy(desc(inspectionCentersTable.rating));
  const all = await query;

  const filtered = q
    ? all.filter(
        c =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.city.toLowerCase().includes(q.toLowerCase()) ||
          (c.province ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : all;

  res.json(filtered.map(c => ({ ...c, rating: Number(c.rating) })));
});

/* POST create inspection center (admin/inspector) */
router.post("/inspection-centers", authMiddleware, inspectorMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { name, city, province, address, phone, contact, rating, isFeatured } = req.body;
  const [created] = await db.insert(inspectionCentersTable).values({
    name,
    city,
    province: province ?? null,
    address: address ?? null,
    phone: phone ?? null,
    contact: contact ?? null,
    rating: rating ? String(rating) : "0",
    isFeatured: isFeatured ?? false,
  }).returning();
  res.status(201).json(created);
});

/* PATCH toggle featured (admin) */
router.patch("/admin/inspection-centers/:id/feature", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id, 10);
  const { isFeatured } = req.body as { isFeatured: boolean };
  const [updated] = await db.update(inspectionCentersTable).set({ isFeatured }).where(eq(inspectionCentersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, data: updated });
});

/* POST book inspection */
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

/* GET my inspections */
router.get("/inspections/mine", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(inspectionsTable)
    .where(eq(inspectionsTable.userId, String(req.user!.id)))
    .orderBy(desc(inspectionsTable.createdAt));
  res.json(rows);
});

export default router;
