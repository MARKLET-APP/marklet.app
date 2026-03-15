import { Router, type IRouter } from "express";
import { db, buyRequestsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const guard = [authMiddleware, adminMiddleware];

router.get("/buy-requests", async (req: any, res): Promise<void> => {
  const category = (req.query as any).category as string | undefined;
  const conditions = [eq(buyRequestsTable.status, "approved")];
  if (category) {
    conditions.push(eq(buyRequestsTable.category, category));
  }
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const requests = await db
    .select({
      id: buyRequestsTable.id,
      userId: buyRequestsTable.userId,
      brand: buyRequestsTable.brand,
      model: buyRequestsTable.model,
      minYear: buyRequestsTable.minYear,
      maxYear: buyRequestsTable.maxYear,
      maxPrice: buyRequestsTable.maxPrice,
      currency: buyRequestsTable.currency,
      city: buyRequestsTable.city,
      paymentType: buyRequestsTable.paymentType,
      description: buyRequestsTable.description,
      status: buyRequestsTable.status,
      category: buyRequestsTable.category,
      createdAt: buyRequestsTable.createdAt,
      userName: usersTable.name,
      userPhoto: usersTable.profilePhoto,
    })
    .from(buyRequestsTable)
    .leftJoin(usersTable, eq(buyRequestsTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(buyRequestsTable.createdAt));

  res.json(requests);
});

async function createBuyRequest(req: AuthRequest, res: any): Promise<void> {
  const { brand, model, year, minYear, maxYear, maxPrice, currency, city, paymentType, description, category } = req.body;

  await db.insert(buyRequestsTable).values({
    userId: req.user!.id,
    brand: brand ?? null,
    model: model ?? null,
    minYear: minYear ? Number(minYear) : (year ? Number(year) : null),
    maxYear: maxYear ? Number(maxYear) : (year ? Number(year) : null),
    maxPrice: maxPrice ? Number(maxPrice) : null,
    currency: currency ?? "USD",
    city: city ?? null,
    paymentType: paymentType ?? null,
    description: description ?? null,
    category: category ?? "cars",
    status: "pending",
  });

  res.status(201).json({ success: true, message: "تم إرسال طلب الشراء وهو بانتظار مراجعة الإدارة" });
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

router.get("/admin/buy-requests", ...guard, async (_req, res): Promise<void> => {
  const requests = await db
    .select({
      id: buyRequestsTable.id,
      userId: buyRequestsTable.userId,
      brand: buyRequestsTable.brand,
      model: buyRequestsTable.model,
      minYear: buyRequestsTable.minYear,
      maxYear: buyRequestsTable.maxYear,
      maxPrice: buyRequestsTable.maxPrice,
      currency: buyRequestsTable.currency,
      city: buyRequestsTable.city,
      paymentType: buyRequestsTable.paymentType,
      description: buyRequestsTable.description,
      status: buyRequestsTable.status,
      createdAt: buyRequestsTable.createdAt,
      userName: usersTable.name,
      userPhone: usersTable.phone,
    })
    .from(buyRequestsTable)
    .leftJoin(usersTable, eq(buyRequestsTable.userId, usersTable.id))
    .orderBy(desc(buyRequestsTable.createdAt));

  res.json(requests);
});

router.patch("/admin/buy-requests/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const [updated] = await db
    .update(buyRequestsTable)
    .set({ status })
    .where(eq(buyRequestsTable.id, id))
    .returning({ id: buyRequestsTable.id, status: buyRequestsTable.status });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/buy-requests/:id", ...guard, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const deleted = await db.delete(buyRequestsTable).where(eq(buyRequestsTable.id, id)).returning({ id: buyRequestsTable.id });
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
