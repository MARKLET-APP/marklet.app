import { Router, type IRouter } from "express";
import { db, junkCarsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/junk-cars", async (req, res): Promise<void> => {
  const rows = await db.select({
    id: junkCarsTable.id,
    sellerId: junkCarsTable.sellerId,
    type: junkCarsTable.type,
    model: junkCarsTable.model,
    year: junkCarsTable.year,
    condition: junkCarsTable.condition,
    price: junkCarsTable.price,
    city: junkCarsTable.city,
    images: junkCarsTable.images,
    description: junkCarsTable.description,
    createdAt: junkCarsTable.createdAt,
    sellerName: usersTable.name,
  })
    .from(junkCarsTable)
    .leftJoin(usersTable, eq(junkCarsTable.sellerId, usersTable.id))
    .orderBy(desc(junkCarsTable.createdAt));

  res.json(rows.map(r => ({ ...r, price: r.price ? Number(r.price) : null })));
});

router.post("/junk-cars", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { type, model, year, condition, price, city, images, description } = req.body;

  const [created] = await db.insert(junkCarsTable).values({
    sellerId: req.user!.id,
    type: type ?? null,
    model: model ?? null,
    year: year ? Number(year) : null,
    condition: condition ?? null,
    price: price ? String(price) : null,
    city: city ?? null,
    images: images ?? null,
    description: description ?? null,
  }).returning();

  res.status(201).json({ success: true, message: "تم نشر إعلان السيارة المعطوبة", data: created });
});

router.delete("/junk-cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(junkCarsTable).where(eq(junkCarsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  if (row.sellerId !== req.user!.id && req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(junkCarsTable).where(eq(junkCarsTable.id, id));
  res.json({ success: true });
});

export default router;
