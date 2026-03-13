import { Router, type IRouter } from "express";
import { db, carPartsTable, usersTable } from "@workspace/db";
import { eq, desc, or, ilike } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/car-parts", async (req, res): Promise<void> => {
  const { q } = req.query as { q?: string };

  let rows;
  if (q) {
    rows = await db.select({
      id: carPartsTable.id,
      sellerId: carPartsTable.sellerId,
      name: carPartsTable.name,
      carType: carPartsTable.carType,
      model: carPartsTable.model,
      year: carPartsTable.year,
      condition: carPartsTable.condition,
      price: carPartsTable.price,
      city: carPartsTable.city,
      images: carPartsTable.images,
      description: carPartsTable.description,
      createdAt: carPartsTable.createdAt,
      sellerName: usersTable.name,
    })
      .from(carPartsTable)
      .leftJoin(usersTable, eq(carPartsTable.sellerId, usersTable.id))
      .where(
        or(
          ilike(carPartsTable.name, `%${q}%`),
          ilike(carPartsTable.carType, `%${q}%`),
          ilike(carPartsTable.model, `%${q}%`)
        )
      )
      .orderBy(desc(carPartsTable.createdAt));
  } else {
    rows = await db.select({
      id: carPartsTable.id,
      sellerId: carPartsTable.sellerId,
      name: carPartsTable.name,
      carType: carPartsTable.carType,
      model: carPartsTable.model,
      year: carPartsTable.year,
      condition: carPartsTable.condition,
      price: carPartsTable.price,
      city: carPartsTable.city,
      images: carPartsTable.images,
      description: carPartsTable.description,
      createdAt: carPartsTable.createdAt,
      sellerName: usersTable.name,
    })
      .from(carPartsTable)
      .leftJoin(usersTable, eq(carPartsTable.sellerId, usersTable.id))
      .orderBy(desc(carPartsTable.createdAt));
  }

  res.json(rows.map(r => ({ ...r, price: Number(r.price) })));
});

router.post("/car-parts", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { name, carType, model, year, condition, price, city, images, description } = req.body;

  if (!name || !price) {
    res.status(400).json({ error: "name and price are required" });
    return;
  }

  const [created] = await db.insert(carPartsTable).values({
    sellerId: req.user!.id,
    name,
    carType: carType ?? null,
    model: model ?? null,
    year: year ? Number(year) : null,
    condition: condition ?? null,
    price: String(price),
    city: city ?? null,
    images: images ?? null,
    description: description ?? null,
  }).returning();

  res.status(201).json({ ...created, price: Number(created.price) });
});

router.delete("/car-parts/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(carPartsTable).where(eq(carPartsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  if (row.sellerId !== req.user!.id && req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(carPartsTable).where(eq(carPartsTable.id, id));
  res.json({ success: true });
});

export default router;
