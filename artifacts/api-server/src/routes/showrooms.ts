import { Router, type IRouter } from "express";
import { db, showroomsTable, carsTable, usersTable, imagesTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";
import { upload, processImage } from "../middlewares/upload.js";
import { checkImageSafety } from "../lib/openai.js";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

// Public: list featured showrooms (only requires isFeatured, not isVerified)
router.get("/showrooms/featured", async (_req, res): Promise<void> => {
  try {
    const showrooms = await db
      .select()
      .from(showroomsTable)
      .where(and(eq(showroomsTable.isFeatured, true), eq(showroomsTable.isSuspended, false)))
      .orderBy(desc(showroomsTable.createdAt))
      .limit(12);
    res.json(showrooms);
  } catch { res.json([]); }
});

// Public: list all showrooms
router.get("/showrooms", async (_req, res): Promise<void> => {
  const showrooms = await db
    .select()
    .from(showroomsTable)
    .where(and(eq(showroomsTable.isVerified, true), eq(showroomsTable.isSuspended, false)))
    .orderBy(desc(showroomsTable.isFeatured), desc(showroomsTable.createdAt))
    .limit(50);
  res.json(showrooms);
});

// Public: get showroom by id
router.get("/showrooms/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [showroom] = await db.select().from(showroomsTable).where(eq(showroomsTable.id, id));
  if (!showroom) { res.status(404).json({ error: "Showroom not found" }); return; }
  
  // Get owner info
  let owner = null;
  if (showroom.ownerUserId) {
    const [u] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, showroom.ownerUserId));
    owner = u;
  }
  
  res.json({ ...showroom, owner });
});

// Public: get showroom cars
router.get("/showrooms/:id/cars", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  
  const cars = await db
    .select({
      id: carsTable.id, brand: carsTable.brand, model: carsTable.model, year: carsTable.year,
      price: carsTable.price, city: carsTable.city, condition: carsTable.condition,
      mileage: carsTable.mileage, fuelType: carsTable.fuelType, category: carsTable.category,
      status: carsTable.status, isFeatured: carsTable.isFeatured, createdAt: carsTable.createdAt,
      showroomId: carsTable.showroomId,
    })
    .from(carsTable)
    .where(and(eq(carsTable.showroomId, id), eq(carsTable.status, "approved")))
    .orderBy(desc(carsTable.createdAt))
    .limit(50);
  
  // Attach primary image for each car
  const carIds = cars.map(c => c.id);
  const images = carIds.length > 0
    ? await db.select({ carId: imagesTable.carId, imageUrl: imagesTable.imageUrl })
        .from(imagesTable)
        .where(and(inArray(imagesTable.carId, carIds), eq(imagesTable.isPrimary, true)))
    : [];
  
  const imageMap = Object.fromEntries(images.map(img => [img.carId, img.imageUrl]));
  const result = cars.map(c => ({ ...c, primaryImage: imageMap[c.id] || null }));
  
  res.json(result);
});

// POST /showrooms/:id/rate  — submit a rating (1-5)
router.post("/showrooms/:id/rate", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const score = Number(req.body.rating);
  if (!score || score < 1 || score > 5) { res.status(400).json({ error: "rating must be 1-5" }); return; }
  const [showroom] = await db.select({ id: showroomsTable.id, rating: showroomsTable.rating }).from(showroomsTable).where(eq(showroomsTable.id, id));
  if (!showroom) { res.status(404).json({ error: "Not found" }); return; }
  // Simple weighted average: blend existing rating with new score (20% weight each new vote)
  const current = Number(showroom.rating) || 0;
  const newRating = current === 0 ? score : Math.round((current * 0.8 + score * 0.2) * 10) / 10;
  const [updated] = await db.update(showroomsTable).set({ rating: String(newRating) }).where(eq(showroomsTable.id, id)).returning({ rating: showroomsTable.rating });
  res.json({ rating: Number(updated.rating) });
});

// ─── Dealer: My Showroom Routes ───────────────────────────────────────────────

// Helper: resolve showroom owned by current user
async function getMyShowroom(userId: number) {
  const [showroom] = await db.select().from(showroomsTable).where(eq(showroomsTable.ownerUserId, userId));
  return showroom ?? null;
}

// Helper: auto-approve logic
function approvalStatus(showroom: { isFeatured: boolean; isVerified: boolean }) {
  const auto = showroom.isFeatured || showroom.isVerified;
  return { status: auto ? "approved" : "pending", isActive: auto };
}

// GET /api/showrooms/my
router.get("/showrooms/my", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const showroom = await getMyShowroom(req.userId!);
  if (!showroom) { res.status(404).json({ error: "no_showroom" }); return; }
  res.json(showroom);
});

// PATCH /api/showrooms/my  — update profile
router.patch("/showrooms/my", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const showroom = await getMyShowroom(req.userId!);
  if (!showroom) { res.status(404).json({ error: "no_showroom" }); return; }
  const allowed = ["name", "logo", "coverImage", "phone", "whatsapp", "city", "address", "description"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [updated] = await db.update(showroomsTable).set(updates).where(eq(showroomsTable.id, showroom.id)).returning();
  res.json(updated);
});

// POST /api/showrooms/upload — upload logo or cover image (no car detection required)
router.post("/showrooms/upload", authMiddleware, upload.single("image"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي ملف" }); return; }
  const tmpPath = path.join("uploads", `srm_tmp_${Date.now()}`);
  fs.mkdirSync("uploads", { recursive: true });
  fs.writeFileSync(tmpPath, req.file.buffer);
  try {
    const isSafe = await checkImageSafety(tmpPath);
    fs.unlinkSync(tmpPath);
    if (!isSafe) { res.status(400).json({ error: "الصورة غير مناسبة" }); return; }
    const url = await processImage(req.file, "showrooms");
    res.json({ url });
  } catch {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).json({ error: "فشل رفع الصورة" });
  }
});

// GET /api/showrooms/my/cars — all cars (all statuses)
router.get("/showrooms/my/cars", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const showroom = await getMyShowroom(req.userId!);
  if (!showroom) { res.status(404).json({ error: "no_showroom" }); return; }

  const cars = await db
    .select()
    .from(carsTable)
    .where(eq(carsTable.showroomId, showroom.id))
    .orderBy(desc(carsTable.createdAt));

  if (cars.length === 0) { res.json([]); return; }
  const carIds = cars.map(c => c.id);
  const images = await db
    .select({ carId: imagesTable.carId, imageUrl: imagesTable.imageUrl })
    .from(imagesTable)
    .where(and(inArray(imagesTable.carId, carIds), eq(imagesTable.isPrimary, true)));
  const imgMap = Object.fromEntries(images.map(i => [i.carId, i.imageUrl]));
  res.json(cars.map(c => ({ ...c, price: Number(c.price), primaryImage: imgMap[c.id] ?? null })));
});

// POST /api/showrooms/my/cars — publish a car
router.post("/showrooms/my/cars", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const showroom = await getMyShowroom(req.userId!);
  if (!showroom) { res.status(404).json({ error: "no_showroom" }); return; }

  const { images, ...carData } = req.body;
  const approval = approvalStatus(showroom);

  const [car] = await db.insert(carsTable).values({
    ...carData,
    sellerId: req.userId!,
    showroomId: showroom.id,
    price: String(carData.price ?? 0),
    status: approval.status,
    isActive: approval.isActive,
  }).returning();

  if (Array.isArray(images) && images.length > 0) {
    await db.insert(imagesTable).values(
      images.map((url: string, idx: number) => ({ carId: car.id, imageUrl: url, isPrimary: idx === 0 }))
    );
  }

  res.status(201).json({ ...car, price: Number(car.price), autoApproved: approval.isActive });
});

// PATCH /api/showrooms/my/cars/:id — edit car
router.patch("/showrooms/my/cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const showroom = await getMyShowroom(req.userId!);
  if (!showroom) { res.status(404).json({ error: "no_showroom" }); return; }

  const [car] = await db.select().from(carsTable).where(and(eq(carsTable.id, id), eq(carsTable.showroomId, showroom.id)));
  if (!car) { res.status(404).json({ error: "Car not found" }); return; }

  const allowed = ["brand", "model", "year", "price", "mileage", "condition", "fuelType",
    "transmission", "color", "city", "province", "description", "title", "category", "saleType"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = k === "price" ? String(req.body[k]) : req.body[k];
  }

  const approval = approvalStatus(showroom);
  updates.status = approval.status;
  updates.isActive = approval.isActive;

  // Handle images replacement
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    await db.delete(imagesTable).where(eq(imagesTable.carId, id));
    await db.insert(imagesTable).values(
      req.body.images.map((url: string, idx: number) => ({ carId: id, imageUrl: url, isPrimary: idx === 0 }))
    );
  }

  const [updated] = await db.update(carsTable).set(updates).where(eq(carsTable.id, id)).returning();
  res.json({ ...updated, price: Number(updated.price), autoApproved: approval.isActive });
});

// DELETE /api/showrooms/my/cars/:id
router.delete("/showrooms/my/cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const showroom = await getMyShowroom(req.userId!);
  if (!showroom) { res.status(404).json({ error: "no_showroom" }); return; }

  const [car] = await db.select({ id: carsTable.id }).from(carsTable)
    .where(and(eq(carsTable.id, id), eq(carsTable.showroomId, showroom.id)));
  if (!car) { res.status(404).json({ error: "Car not found" }); return; }

  await db.delete(imagesTable).where(eq(imagesTable.carId, id));
  await db.delete(carsTable).where(eq(carsTable.id, id));
  res.sendStatus(204);
});

export default router;
