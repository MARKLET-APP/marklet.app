import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, usersTable, carsTable, reviewsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

function safeUser(user: typeof usersTable.$inferSelect, extras: Record<string, unknown> = {}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePhoto: user.profilePhoto,
    province: user.province,
    city: user.city,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    showroomName: user.showroomName,
    showroomAddress: user.showroomAddress,
    showroomPhone: user.showroomPhone,
    showroomPhoto: user.showroomPhoto,
    createdAt: user.createdAt,
    ...extras,
  };
}

router.get("/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [listingCountResult] = await db.select({ count: count() }).from(carsTable).where(eq(carsTable.sellerId, id));
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.reviewedUserId, id));
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length : null;

  res.json(safeUser(user, {
    listingCount: Number(listingCountResult.count),
    averageRating: avgRating,
    reviewCount: reviews.length,
  }));
});

router.patch("/users/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  if (req.userId !== id && req.userRole !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const body = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.phone === "string") updateData.phone = body.phone;
  if (typeof body.province === "string") updateData.province = body.province;
  if (typeof body.city === "string") updateData.city = body.city;
  if (typeof body.profilePhoto === "string") updateData.profilePhoto = body.profilePhoto;
  if (typeof body.showroomName === "string") updateData.showroomName = body.showroomName;
  if (typeof body.showroomAddress === "string") updateData.showroomAddress = body.showroomAddress;
  if (typeof body.showroomPhone === "string") updateData.showroomPhone = body.showroomPhone;
  if (typeof body.showroomPhoto === "string") updateData.showroomPhoto = body.showroomPhoto;
  if (typeof body.role === "string" && ["buyer", "seller", "dealer"].includes(body.role)) {
    updateData.role = body.role;
  }

  if (Object.keys(updateData).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  res.json(safeUser(updated));
});

router.post("/users/:id/avatar", authMiddleware, avatarUpload.single("avatar"), async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  if (req.userId !== id) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const photoUrl = `/api/uploads/avatars/${req.file.filename}`;
  const [updated] = await db.update(usersTable).set({ profilePhoto: photoUrl }).where(eq(usersTable.id, id)).returning();
  res.json({ profilePhoto: updated.profilePhoto });
});

export default router;
