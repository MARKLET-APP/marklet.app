import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateReviewBody, GetUserReviewsParams } from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/reviews", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reviewer] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  const [review] = await db.insert(reviewsTable).values({
    reviewerId: req.userId!,
    reviewedUserId: parsed.data.reviewedUserId,
    rating: String(parsed.data.rating),
    comment: parsed.data.comment ?? null,
    responseSpeed: parsed.data.responseSpeed ?? null,
    trustLevel: parsed.data.trustLevel ?? null,
    listingAccuracy: parsed.data.listingAccuracy ?? null,
  }).returning();

  res.status(201).json({
    ...review,
    rating: Number(review.rating),
    reviewerName: reviewer?.name ?? "Unknown",
    reviewerPhoto: reviewer?.profilePhoto ?? null,
  });
});

router.get("/reviews/user/:userId", async (req, res): Promise<void> => {
  const params = GetUserReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reviews = await db.select({
    id: reviewsTable.id,
    reviewerId: reviewsTable.reviewerId,
    reviewedUserId: reviewsTable.reviewedUserId,
    rating: reviewsTable.rating,
    comment: reviewsTable.comment,
    responseSpeed: reviewsTable.responseSpeed,
    trustLevel: reviewsTable.trustLevel,
    listingAccuracy: reviewsTable.listingAccuracy,
    createdAt: reviewsTable.createdAt,
    reviewerName: usersTable.name,
    reviewerPhoto: usersTable.profilePhoto,
  })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
    .where(eq(reviewsTable.reviewedUserId, params.data.userId));

  res.json(reviews.map(r => ({
    ...r,
    rating: Number(r.rating),
    reviewerName: r.reviewerName ?? "Unknown",
    reviewerPhoto: r.reviewerPhoto ?? null,
  })));
});

export default router;
