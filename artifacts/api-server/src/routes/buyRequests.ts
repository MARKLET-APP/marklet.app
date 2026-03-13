import { Router, type IRouter } from "express";
import { db, buyRequestsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/buy-requests", async (req, res): Promise<void> => {
  const requests = await db
    .select({
      id: buyRequestsTable.id,
      userId: buyRequestsTable.userId,
      brand: buyRequestsTable.brand,
      model: buyRequestsTable.model,
      minYear: buyRequestsTable.minYear,
      maxYear: buyRequestsTable.maxYear,
      maxPrice: buyRequestsTable.maxPrice,
      city: buyRequestsTable.city,
      paymentType: buyRequestsTable.paymentType,
      description: buyRequestsTable.description,
      createdAt: buyRequestsTable.createdAt,
      userName: usersTable.name,
      userPhoto: usersTable.profilePhoto,
    })
    .from(buyRequestsTable)
    .leftJoin(usersTable, eq(buyRequestsTable.userId, usersTable.id))
    .orderBy(desc(buyRequestsTable.createdAt));

  res.json(requests);
});

async function createBuyRequest(req: AuthRequest, res: any): Promise<void> {
  const { brand, model, minYear, maxYear, maxPrice, city, paymentType, description } = req.body;

  await db.insert(buyRequestsTable).values({
    userId: req.user!.id,
    brand: brand ?? null,
    model: model ?? null,
    minYear: minYear ? Number(minYear) : null,
    maxYear: maxYear ? Number(maxYear) : null,
    maxPrice: maxPrice ? Number(maxPrice) : null,
    city: city ?? null,
    paymentType: paymentType ?? null,
    description: description ?? null,
  });

  res.status(201).json({ success: true, message: "تم نشر طلب الشراء" });
}

router.post("/buy-requests", authMiddleware, createBuyRequest);
router.post("/buy-request", authMiddleware, createBuyRequest);

router.get("/buy-requests/mine", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const requests = await db
    .select()
    .from(buyRequestsTable)
    .where(eq(buyRequestsTable.userId, req.user!.id))
    .orderBy(desc(buyRequestsTable.createdAt));

  res.json(requests);
});

router.delete("/buy-requests/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  const [existing] = await db.select().from(buyRequestsTable).where(eq(buyRequestsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.userId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(buyRequestsTable).where(eq(buyRequestsTable.id, id));
  res.json({ success: true });
});

export default router;
