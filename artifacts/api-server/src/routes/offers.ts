import { Router, type IRouter } from "express";
import { db, offersTable, carsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/offers", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { carId, offerPrice } = req.body;

  if (!carId || offerPrice === undefined) {
    res.status(400).json({ error: "carId and offerPrice are required" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, Number(carId))).limit(1);
  if (!car) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  if (car.sellerId === req.userId) {
    res.status(400).json({ error: "لا يمكنك تقديم عرض على سيارتك" });
    return;
  }

  const [offer] = await db.insert(offersTable).values({
    carId: Number(carId),
    buyerId: req.userId!,
    offerPrice: String(offerPrice),
  }).returning();

  res.status(201).json({ ...offer, offerPrice: Number(offer.offerPrice) });
});

router.get("/offers", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const offers = await db.select().from(offersTable)
    .where(eq(offersTable.buyerId, req.userId!));

  res.json(offers.map(o => ({ ...o, offerPrice: Number(o.offerPrice) })));
});

router.get("/offers/received", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const myCars = await db.select({ id: carsTable.id }).from(carsTable)
    .where(eq(carsTable.sellerId, req.userId!));

  if (myCars.length === 0) {
    res.json([]);
    return;
  }

  const carIds = myCars.map(c => c.id);
  const offers = await db.select().from(offersTable)
    .where(eq(offersTable.carId, carIds[0]));

  res.json(offers.map(o => ({ ...o, offerPrice: Number(o.offerPrice) })));
});

router.patch("/offers/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be accepted or rejected" });
    return;
  }

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, id)).limit(1);
  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, offer.carId)).limit(1);
  if (car?.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db.update(offersTable).set({ status })
    .where(eq(offersTable.id, id)).returning();

  res.json({ ...updated, offerPrice: Number(updated.offerPrice) });
});

export default router;
