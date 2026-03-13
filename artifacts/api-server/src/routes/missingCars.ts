import { Router, type IRouter } from "express";
import { db, missingCarsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/missing-cars", async (_req, res): Promise<void> => {
  const rows = await db.select({
    id: missingCarsTable.id,
    reporterId: missingCarsTable.reporterId,
    image: missingCarsTable.image,
    brand: missingCarsTable.brand,
    model: missingCarsTable.model,
    color: missingCarsTable.color,
    plateNumber: missingCarsTable.plateNumber,
    city: missingCarsTable.city,
    description: missingCarsTable.description,
    isFound: missingCarsTable.isFound,
    createdAt: missingCarsTable.createdAt,
    reporterName: usersTable.name,
  })
    .from(missingCarsTable)
    .leftJoin(usersTable, eq(missingCarsTable.reporterId, usersTable.id))
    .orderBy(desc(missingCarsTable.createdAt));

  res.json(rows);
});

router.post("/missing-cars", async (req, res): Promise<void> => {
  const { reporterId, image, brand, model, color, plateNumber, city, description } = req.body;

  const [created] = await db.insert(missingCarsTable).values({
    reporterId: reporterId ? Number(reporterId) : null,
    image: image ?? null,
    brand: brand ?? null,
    model: model ?? null,
    color: color ?? null,
    plateNumber: plateNumber ?? null,
    city: city ?? null,
    description: description ?? null,
  }).returning();

  res.status(201).json({ success: true, message: "تم نشر بلاغ السيارة المفقودة", data: created });
});

router.patch("/missing-cars/:id/found", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.update(missingCarsTable).set({ isFound: "yes" }).where(eq(missingCarsTable.id, id));
  res.json({ success: true, message: "تم تحديث حالة السيارة إلى: تم العثور عليها" });
});

router.delete("/missing-cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(missingCarsTable).where(eq(missingCarsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  if (row.reporterId !== req.user!.id && req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(missingCarsTable).where(eq(missingCarsTable.id, id));
  res.json({ success: true });
});

export default router;
