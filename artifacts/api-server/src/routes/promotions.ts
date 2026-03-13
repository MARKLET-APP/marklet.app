import { Router, type IRouter } from "express";
import { db, promotionsTable, carsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/promotions", async (req, res): Promise<void> => {
  const { carId } = req.query;

  const conditions = [];
  if (carId) conditions.push(eq(promotionsTable.carId, Number(carId)));

  const promotions = conditions.length
    ? await db.select().from(promotionsTable).where(and(...conditions))
    : await db.select().from(promotionsTable);

  res.json(promotions);
});

router.post("/promotions", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { carId, type, startDate, endDate } = req.body;

  if (!carId || !type || !startDate || !endDate) {
    res.status(400).json({ error: "carId, type, startDate, and endDate are required" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, Number(carId))).limit(1);
  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  if (car.sellerId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [promotion] = await db.insert(promotionsTable).values({
    carId: Number(carId),
    type,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  }).returning();

  res.status(201).json(promotion);
});

router.delete("/promotions/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
  res.sendStatus(204);
});

export default router;
