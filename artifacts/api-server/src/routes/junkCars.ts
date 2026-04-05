import { Router, type IRouter } from "express";
import { db, junkCarsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";
import { sendPushToUser } from "../services/pushService.js";

const router: IRouter = Router();

/* GET all APPROVED junk cars (public) */
router.get("/junk-cars", async (req: any, res): Promise<void> => {
  const isAdmin = req.user?.role === "admin";
  const statusFilter = isAdmin ? undefined : eq(junkCarsTable.status, "approved");

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
    status: junkCarsTable.status,
    createdAt: junkCarsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(junkCarsTable)
    .leftJoin(usersTable, eq(junkCarsTable.sellerId, usersTable.id))
    .where(statusFilter)
    .orderBy(desc(junkCarsTable.createdAt));

  res.json(rows.map(r => ({ ...r, price: r.price ? Number(r.price) : null })));
});

/* GET junk cars pending admin approval */
router.get("/admin/junk-cars/pending", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

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
    status: junkCarsTable.status,
    createdAt: junkCarsTable.createdAt,
    sellerName: usersTable.name,
    sellerPhone: usersTable.phone,
  })
    .from(junkCarsTable)
    .leftJoin(usersTable, eq(junkCarsTable.sellerId, usersTable.id))
    .where(eq(junkCarsTable.status, "pending"))
    .orderBy(desc(junkCarsTable.createdAt));

  res.json(rows.map(r => ({ ...r, price: r.price ? Number(r.price) : null })));
});

/* PATCH approve/reject junk car (admin) */
router.patch("/admin/junk-cars/:id/approve", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id, 10);
  const { approve } = req.body as { approve: boolean };
  if (typeof approve !== "boolean") { res.status(400).json({ error: "approve field (boolean) required" }); return; }

  const [item] = await db.select({ sellerId: junkCarsTable.sellerId, type: junkCarsTable.type, model: junkCarsTable.model })
    .from(junkCarsTable).where(eq(junkCarsTable.id, id)).limit(1);

  if (!item) { res.status(404).json({ error: "Not found" }); return; }

  if (!approve) {
    if (item?.sellerId) {
      const label = [item.type, item.model].filter(Boolean).join(" ") || "سيارة";
      const msg = `تم رفض إعلانك "${label}". يمكنك تعديله وإعادة إرساله`;
      await db.insert(notificationsTable).values({ userId: item.sellerId, type: "rejection", message: msg }).catch(() => {});
      sendPushToUser(item.sellerId, { title: "❌ تم رفض إعلانك", body: msg, tag: `junk-rejected-${id}` }).catch(() => {});
    }
    await db.delete(junkCarsTable).where(eq(junkCarsTable.id, id));
    res.json({ success: true, message: "تم رفض الإعلان وحذفه" });
    return;
  }

  const [updated] = await db
    .update(junkCarsTable)
    .set({ status: "approved" })
    .where(eq(junkCarsTable.id, id))
    .returning();

  if (item?.sellerId) {
    const label = [item.type, item.model].filter(Boolean).join(" ") || "سيارة";
    const msg = `تمت الموافقة على إعلانك "${label}" ونشره على LAZEMNI`;
    await db.insert(notificationsTable).values({ userId: item.sellerId, type: "approval", message: msg, link: "/junk-cars" }).catch(() => {});
    sendPushToUser(item.sellerId, { title: "✅ تمت الموافقة على إعلانك", body: msg, url: "/junk-cars", tag: `junk-approved-${id}` }).catch(() => {});
  }

  res.json({ success: true, message: "تمت الموافقة على الإعلان ونشره", data: updated });
});

/* POST create junk car → pending approval */
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
    status: "pending",
  }).returning();

  const label = [type, model].filter(Boolean).join(" ") || "سيارة";
  await db.insert(notificationsTable).values({
    userId: req.user!.id, type: "marketplace_pending",
    message: `إعلانك "${label}" قيد المراجعة ⏳ — سيتم مراجعته ونشره قريباً`,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: "تم إرسال إعلانك وهو قيد مراجعة الإدارة، سيظهر بعد الموافقة",
    data: { ...created, price: created.price ? Number(created.price) : null },
  });
});

/* DELETE junk car */
router.delete("/junk-cars/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(junkCarsTable).where(eq(junkCarsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  if (row.sellerId !== req.user!.id && req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(junkCarsTable).where(eq(junkCarsTable.id, id));
  res.json({ success: true });
});

export default router;
