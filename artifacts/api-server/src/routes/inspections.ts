import { Router, type IRouter } from "express";
import { db, inspectionCentersTable, inspectionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, inspectorMiddleware, type AuthRequest } from "../lib/auth.js";
import { upload, processImage } from "../middlewares/upload.js";
import { checkImageSafety } from "../lib/openai.js";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMyCenter(userId: number) {
  const [c] = await db.select().from(inspectionCentersTable).where(eq(inspectionCentersTable.ownerUserId, userId));
  return c ?? null;
}

// ─── Static/My routes (MUST come before /:id wildcards) ──────────────────────

// GET /inspection-centers/my
router.get("/inspection-centers/my", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const center = await getMyCenter(req.userId!);
  if (!center) { res.status(404).json({ error: "no_center" }); return; }
  res.json({ ...center, rating: Number(center.rating) });
});

// PATCH /inspection-centers/my
router.patch("/inspection-centers/my", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const center = await getMyCenter(req.userId!);
  if (!center) { res.status(404).json({ error: "no_center" }); return; }
  const allowed = ["name", "logo", "coverImage", "phone", "whatsapp", "city", "address", "description", "services"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [updated] = await db.update(inspectionCentersTable).set(updates).where(eq(inspectionCentersTable.id, center.id)).returning();
  res.json({ ...updated, rating: Number(updated.rating) });
});

// POST /inspection-centers/upload — logo/cover upload
router.post("/inspection-centers/upload", authMiddleware, upload.single("image"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي ملف" }); return; }
  const tmpPath = path.join("uploads", `ic_tmp_${Date.now()}`);
  fs.mkdirSync("uploads", { recursive: true });
  fs.writeFileSync(tmpPath, req.file.buffer);
  try {
    const isSafe = await checkImageSafety(tmpPath);
    fs.unlinkSync(tmpPath);
    if (!isSafe) { res.status(400).json({ error: "الصورة غير مناسبة" }); return; }
    const url = await processImage(req.file, "inspection-centers");
    res.json({ url });
  } catch {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).json({ error: "فشل رفع الصورة" });
  }
});

// GET /inspection-centers  — public list
router.get("/inspection-centers", async (req, res): Promise<void> => {
  const q = (req.query.q as string) || "";
  const all = await db.select().from(inspectionCentersTable)
    .where(eq(inspectionCentersTable.isSuspended, false))
    .orderBy(desc(inspectionCentersTable.isFeatured), desc(inspectionCentersTable.rating));

  const filtered = q
    ? all.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.city.toLowerCase().includes(q.toLowerCase()) ||
        (c.province ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : all;

  res.json(filtered.map(c => ({ ...c, rating: Number(c.rating) })));
});

// POST /inspection-centers — create (admin)
router.post("/inspection-centers", authMiddleware, inspectorMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { name, city, province, address, phone, contact, rating, isFeatured } = req.body;
  const [created] = await db.insert(inspectionCentersTable).values({
    name, city,
    province: province ?? null,
    address: address ?? null,
    phone: phone ?? null,
    contact: contact ?? null,
    rating: rating ? String(rating) : "0",
    isFeatured: isFeatured ?? false,
  }).returning();
  res.status(201).json(created);
});

// PATCH /admin/inspection-centers/:id/feature
router.patch("/admin/inspection-centers/:id/feature", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id, 10);
  const { isFeatured } = req.body as { isFeatured: boolean };
  const [updated] = await db.update(inspectionCentersTable).set({ isFeatured }).where(eq(inspectionCentersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, data: updated });
});

// ─── Public wildcard routes (AFTER static/my) ────────────────────────────────

// GET /inspection-centers/:id
router.get("/inspection-centers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [center] = await db.select().from(inspectionCentersTable).where(eq(inspectionCentersTable.id, id));
  if (!center) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ...center, rating: Number(center.rating) });
});

// POST /inspection-centers/:id/rate
router.post("/inspection-centers/:id/rate", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const score = Number(req.body.rating);
  if (!score || score < 1 || score > 5) { res.status(400).json({ error: "rating must be 1-5" }); return; }
  const [center] = await db.select({ id: inspectionCentersTable.id, rating: inspectionCentersTable.rating })
    .from(inspectionCentersTable).where(eq(inspectionCentersTable.id, id));
  if (!center) { res.status(404).json({ error: "Not found" }); return; }
  const current = Number(center.rating) || 0;
  const newRating = current === 0 ? score : Math.round((current * 0.8 + score * 0.2) * 10) / 10;
  const [updated] = await db.update(inspectionCentersTable).set({ rating: String(newRating) })
    .where(eq(inspectionCentersTable.id, id)).returning({ rating: inspectionCentersTable.rating });
  res.json({ rating: Number(updated.rating) });
});

// ─── Inspection bookings ──────────────────────────────────────────────────────

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
