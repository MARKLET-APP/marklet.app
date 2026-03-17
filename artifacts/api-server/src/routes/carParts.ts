import { Router, type IRouter } from "express";
import { db, carPartsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc, or, ilike, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

/* GET all APPROVED car parts (public) */
router.get("/car-parts", async (req: any, res): Promise<void> => {
  const { q } = req.query as { q?: string };
  const isAdmin = req.user?.role === "admin";

  const statusFilter = isAdmin ? undefined : eq(carPartsTable.status, "approved");

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
      status: carPartsTable.status,
      createdAt: carPartsTable.createdAt,
      sellerName: usersTable.name,
      sellerPhone: usersTable.phone,
    })
      .from(carPartsTable)
      .leftJoin(usersTable, eq(carPartsTable.sellerId, usersTable.id))
      .where(
        and(
          statusFilter,
          or(
            ilike(carPartsTable.name, `%${q}%`),
            ilike(carPartsTable.carType, `%${q}%`),
            ilike(carPartsTable.model, `%${q}%`)
          )
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
      status: carPartsTable.status,
      createdAt: carPartsTable.createdAt,
      sellerName: usersTable.name,
      sellerPhone: usersTable.phone,
    })
      .from(carPartsTable)
      .leftJoin(usersTable, eq(carPartsTable.sellerId, usersTable.id))
      .where(statusFilter)
      .orderBy(desc(carPartsTable.createdAt));
  }

  res.json(rows.map(r => ({ ...r, price: Number(r.price) })));
});

/* GET car parts pending admin approval */
router.get("/admin/car-parts/pending", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db.select({
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
    status: carPartsTable.status,
    createdAt: carPartsTable.createdAt,
    sellerName: usersTable.name,
  })
    .from(carPartsTable)
    .leftJoin(usersTable, eq(carPartsTable.sellerId, usersTable.id))
    .where(eq(carPartsTable.status, "pending"))
    .orderBy(desc(carPartsTable.createdAt));

  res.json(rows.map(r => ({ ...r, price: Number(r.price) })));
});

/* PATCH approve/reject car part (admin) */
router.patch("/admin/car-parts/:id/approve", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id, 10);
  const { approve } = req.body as { approve: boolean };
  if (typeof approve !== "boolean") { res.status(400).json({ error: "approve field (boolean) required" }); return; }

  const [part] = await db.select({ sellerId: carPartsTable.sellerId, name: carPartsTable.name })
    .from(carPartsTable).where(eq(carPartsTable.id, id)).limit(1);

  if (!part) { res.status(404).json({ error: "Not found" }); return; }

  if (!approve) {
    await db.delete(carPartsTable).where(eq(carPartsTable.id, id));
    if (part?.sellerId) {
      await db.insert(notificationsTable).values({
        userId: part.sellerId,
        type: "system",
        message: `تم رفض إعلان القطعة "${part.name}" من قبل الإدارة.`,
      });
    }
    res.json({ success: true, message: "تم رفض الإعلان وحذفه" });
    return;
  }

  const [updated] = await db
    .update(carPartsTable)
    .set({ status: "approved" })
    .where(eq(carPartsTable.id, id))
    .returning();

  if (part?.sellerId) {
    await db.insert(notificationsTable).values({
      userId: part.sellerId,
      type: "system",
      message: `تمت الموافقة على إعلان القطعة "${part.name}" وتم نشره.`,
    });
  }

  res.json({ success: true, message: "تمت الموافقة على الإعلان ونشره", data: updated });
});

/* POST create car part → pending approval */
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
    status: "pending",
  }).returning();

  res.status(201).json({
    success: true,
    message: "تم إرسال إعلانك وهو قيد مراجعة الإدارة، سيظهر بعد الموافقة",
    data: { ...created, price: Number(created.price) },
  });
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
