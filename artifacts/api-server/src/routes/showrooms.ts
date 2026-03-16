import { Router, type IRouter } from "express";
import { db, showroomsTable, carsTable, usersTable, imagesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

// Public: list featured showrooms
router.get("/showrooms/featured", async (_req, res): Promise<void> => {
  const showrooms = await db
    .select()
    .from(showroomsTable)
    .where(and(eq(showroomsTable.isFeatured, true), eq(showroomsTable.isVerified, true), eq(showroomsTable.isSuspended, false)))
    .orderBy(desc(showroomsTable.createdAt))
    .limit(12);
  res.json(showrooms);
});

// Public: list all showrooms
router.get("/showrooms", async (_req, res): Promise<void> => {
  const showrooms = await db
    .select()
    .from(showroomsTable)
    .where(and(eq(showroomsTable.isVerified, true), eq(showroomsTable.isSuspended, false)))
    .orderBy(desc(showroomsTable.isFeatured), desc(showroomsTable.createdAt))
    .limit(50);
  res.json(showrooms);
});

// Public: get showroom by id
router.get("/showrooms/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [showroom] = await db.select().from(showroomsTable).where(eq(showroomsTable.id, id));
  if (!showroom) { res.status(404).json({ error: "Showroom not found" }); return; }
  
  // Get owner info
  let owner = null;
  if (showroom.ownerUserId) {
    const [u] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, showroom.ownerUserId));
    owner = u;
  }
  
  res.json({ ...showroom, owner });
});

// Public: get showroom cars
router.get("/showrooms/:id/cars", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  
  const cars = await db
    .select({
      id: carsTable.id, brand: carsTable.brand, model: carsTable.model, year: carsTable.year,
      price: carsTable.price, city: carsTable.city, condition: carsTable.condition,
      mileage: carsTable.mileage, fuelType: carsTable.fuelType, category: carsTable.category,
      status: carsTable.status, isFeatured: carsTable.isFeatured, createdAt: carsTable.createdAt,
      showroomId: carsTable.showroomId,
    })
    .from(carsTable)
    .where(and(eq(carsTable.showroomId, id), eq(carsTable.status, "approved")))
    .orderBy(desc(carsTable.createdAt))
    .limit(50);
  
  // Attach primary image for each car
  const carIds = cars.map(c => c.id);
  const images = carIds.length > 0
    ? await db.select({ carId: imagesTable.carId, url: imagesTable.url })
        .from(imagesTable)
        .where(eq(imagesTable.isPrimary, true))
    : [];
  
  const imageMap = Object.fromEntries(images.map(img => [img.carId, img.url]));
  const result = cars.map(c => ({ ...c, primaryImage: imageMap[c.id] || null }));
  
  res.json(result);
});

export default router;
