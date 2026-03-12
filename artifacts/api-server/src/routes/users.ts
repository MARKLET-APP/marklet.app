import { Router, type IRouter } from "express";
import { db, usersTable, carsTable, reviewsTable } from "@workspace/db";
import { eq, count, avg } from "drizzle-orm";
import { UpdateUserBody } from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [listingCountResult] = await db.select({ count: count() }).from(carsTable)
    .where(eq(carsTable.sellerId, id));
  
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.reviewedUserId, id));
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
    : null;

  res.json({
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
    listingCount: Number(listingCountResult.count),
    averageRating: avgRating,
    reviewCount: reviews.length,
    createdAt: user.createdAt,
  });
});

router.patch("/users/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  if (req.userId !== id && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.profilePhoto !== undefined) updateData.profilePhoto = parsed.data.profilePhoto;
  if (parsed.data.province !== undefined) updateData.province = parsed.data.province;
  if (parsed.data.city !== undefined) updateData.city = parsed.data.city;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    profilePhoto: updated.profilePhoto,
    province: updated.province,
    city: updated.city,
    isVerified: updated.isVerified,
    isPremium: updated.isPremium,
    createdAt: updated.createdAt,
  });
});

export default router;
