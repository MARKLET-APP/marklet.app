import { Router, type IRouter } from "express";
import { db, realEstateTable, usersTable } from "@workspace/db";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

/* GET all active real estate listings (public) */
router.get("/real-estate", async (req: any, res): Promise<void> => {
  try {
    const { q, listingType, subCategory, province, limit = "20", offset = "0" } = req.query as Record<string, string>;

    const filters: any[] = [eq(realEstateTable.isActive, true), eq(realEstateTable.status, "active")];
    if (listingType) filters.push(eq(realEstateTable.listingType, listingType));
    if (subCategory) filters.push(eq(realEstateTable.subCategory, subCategory));
    if (province) filters.push(eq(realEstateTable.province, province));
    if (q) filters.push(or(ilike(realEstateTable.title, `%${q}%`), ilike(realEstateTable.description, `%${q}%`)));

    const rows = await db
      .select({
        id: realEstateTable.id,
        title: realEstateTable.title,
        listingType: realEstateTable.listingType,
        subCategory: realEstateTable.subCategory,
        price: realEstateTable.price,
        area: realEstateTable.area,
        rooms: realEstateTable.rooms,
        province: realEstateTable.province,
        city: realEstateTable.city,
        images: realEstateTable.images,
        isFeatured: realEstateTable.isFeatured,
        viewCount: realEstateTable.viewCount,
        createdAt: realEstateTable.createdAt,
        sellerName: usersTable.name,
        sellerId: realEstateTable.sellerId,
      })
      .from(realEstateTable)
      .leftJoin(usersTable, eq(realEstateTable.sellerId, usersTable.id))
      .where(and(...filters))
      .orderBy(desc(realEstateTable.isFeatured), desc(realEstateTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(rows);
  } catch (err) {
    console.error("GET /real-estate error:", err);
    res.status(500).json({ error: "فشل تحميل إعلانات العقارات" });
  }
});

/* GET single real estate listing */
router.get("/real-estate/:id", async (req: any, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        id: realEstateTable.id,
        sellerId: realEstateTable.sellerId,
        title: realEstateTable.title,
        listingType: realEstateTable.listingType,
        subCategory: realEstateTable.subCategory,
        price: realEstateTable.price,
        area: realEstateTable.area,
        rooms: realEstateTable.rooms,
        bathrooms: realEstateTable.bathrooms,
        floor: realEstateTable.floor,
        province: realEstateTable.province,
        city: realEstateTable.city,
        location: realEstateTable.location,
        description: realEstateTable.description,
        images: realEstateTable.images,
        isFeatured: realEstateTable.isFeatured,
        viewCount: realEstateTable.viewCount,
        createdAt: realEstateTable.createdAt,
        sellerName: usersTable.name,
        sellerPhone: usersTable.phone,
      })
      .from(realEstateTable)
      .leftJoin(usersTable, eq(realEstateTable.sellerId, usersTable.id))
      .where(eq(realEstateTable.id, id));

    if (!row) { res.status(404).json({ error: "الإعلان غير موجود" }); return; }

    await db.update(realEstateTable).set({ viewCount: sql`${realEstateTable.viewCount} + 1` }).where(eq(realEstateTable.id, id));
    res.json(row);
  } catch (err) {
    console.error("GET /real-estate/:id error:", err);
    res.status(500).json({ error: "فشل تحميل الإعلان" });
  }
});

/* POST create real estate listing (auth required) */
router.post("/real-estate", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, listingType, subCategory, price, area, rooms, bathrooms, floor, province, city, location, description, images } = req.body;

    if (!title || !listingType || !subCategory || !price || !province || !city) {
      res.status(400).json({ error: "يرجى تعبئة الحقول الإلزامية" });
      return;
    }

    const [created] = await db.insert(realEstateTable).values({
      sellerId: userId,
      title,
      listingType,
      subCategory,
      price: String(price),
      area: area ? String(area) : null,
      rooms: rooms ? Number(rooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      floor: floor ? Number(floor) : null,
      province,
      city,
      location: location || null,
      description: description || null,
      images: images || [],
      status: "active",
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /real-estate error:", err);
    res.status(500).json({ error: "فشل نشر الإعلان" });
  }
});

/* DELETE real estate listing (owner or admin) */
router.delete("/real-estate/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";

    const [row] = await db.select({ sellerId: realEstateTable.sellerId }).from(realEstateTable).where(eq(realEstateTable.id, id));
    if (!row) { res.status(404).json({ error: "الإعلان غير موجود" }); return; }
    if (!isAdmin && row.sellerId !== userId) { res.status(403).json({ error: "غير مصرح" }); return; }

    await db.update(realEstateTable).set({ isActive: false, status: "closed" }).where(eq(realEstateTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "فشل حذف الإعلان" });
  }
});

export default router;
