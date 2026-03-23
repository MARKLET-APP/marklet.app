import { Router, type IRouter } from "express";
import { db, scrapCentersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";
import { upload, processImage } from "../middlewares/upload.js";
import { checkImageSafety } from "../lib/openai.js";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMyCenter(userId: number) {
  const [c] = await db.select().from(scrapCentersTable).where(eq(scrapCentersTable.ownerUserId, userId));
  return c ?? null;
}

// ─── Static/My routes (MUST come before /:id wildcards) ──────────────────────

// GET /scrap-centers/my
router.get("/scrap-centers/my", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const center = await getMyCenter(req.userId!);
  if (!center) { res.status(404).json({ error: "no_center" }); return; }
  res.json({ ...center, rating: Number(center.rating) });
});

// PATCH /scrap-centers/my
router.patch("/scrap-centers/my", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const center = await getMyCenter(req.userId!);
  if (!center) { res.status(404).json({ error: "no_center" }); return; }
  const allowed = ["name", "logo", "coverImage", "phone", "whatsapp", "city", "address", "description", "acceptedTypes"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [updated] = await db.update(scrapCentersTable).set(updates).where(eq(scrapCentersTable.id, center.id)).returning();
  res.json({ ...updated, rating: Number(updated.rating) });
});

// POST /scrap-centers/upload — logo/cover upload
router.post("/scrap-centers/upload", authMiddleware, upload.single("image"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي ملف" }); return; }
  const tmpPath = path.join("uploads", `sc_tmp_${Date.now()}`);
  fs.mkdirSync("uploads", { recursive: true });
  fs.writeFileSync(tmpPath, req.file.buffer);
  try {
    const isSafe = await checkImageSafety(tmpPath);
    fs.unlinkSync(tmpPath);
    if (!isSafe) { res.status(400).json({ error: "الصورة غير مناسبة" }); return; }
    const url = await processImage(req.file, "scrap-centers");
    res.json({ url });
  } catch {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).json({ error: "فشل رفع الصورة" });
  }
});

// GET /scrap-centers — public list
router.get("/scrap-centers", async (_req, res): Promise<void> => {
  const centers = await db.select().from(scrapCentersTable)
    .where(eq(scrapCentersTable.isSuspended, false))
    .orderBy(desc(scrapCentersTable.isFeatured), desc(scrapCentersTable.rating));
  res.json(centers.map(c => ({ ...c, rating: Number(c.rating) })));
});

// ─── Public wildcard routes (AFTER static/my) ────────────────────────────────

// GET /scrap-centers/:id
router.get("/scrap-centers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [center] = await db.select().from(scrapCentersTable).where(eq(scrapCentersTable.id, id));
  if (!center) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ...center, rating: Number(center.rating) });
});

// POST /scrap-centers/:id/rate
router.post("/scrap-centers/:id/rate", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const score = Number(req.body.rating);
  if (!score || score < 1 || score > 5) { res.status(400).json({ error: "rating must be 1-5" }); return; }
  const [center] = await db.select({ id: scrapCentersTable.id, rating: scrapCentersTable.rating })
    .from(scrapCentersTable).where(eq(scrapCentersTable.id, id));
  if (!center) { res.status(404).json({ error: "Not found" }); return; }
  const current = Number(center.rating) || 0;
  const newRating = current === 0 ? score : Math.round((current * 0.8 + score * 0.2) * 10) / 10;
  const [updated] = await db.update(scrapCentersTable).set({ rating: String(newRating) })
    .where(eq(scrapCentersTable.id, id)).returning({ rating: scrapCentersTable.rating });
  res.json({ rating: Number(updated.rating) });
});

export default router;
