import { Router, type IRouter } from "express";
import { db, adViewsTable } from "@workspace/db";
import { eq, gte, count, and } from "drizzle-orm";

const router: IRouter = Router();

// تسجيل المشاهدة
router.post("/ad/view", async (req, res): Promise<void> => {
  const { car_id, user_id } = req.body;

  if (!car_id) {
    res.status(400).json({ error: "car_id is required" });
    return;
  }

  await db.insert(adViewsTable).values({
    carId: Number(car_id),
    userId: user_id ? Number(user_id) : null,
  });

  res.json({ status: "ok" });
});

// إرجاع عدد المشاهدات آخر 24 ساعة + وسم Hot
router.get("/ad/:car_id/views", async (req, res): Promise<void> => {
  const car_id = parseInt(Array.isArray(req.params.car_id) ? req.params.car_id[0] : req.params.car_id, 10);
  if (isNaN(car_id)) {
    res.status(400).json({ error: "Invalid car_id" });
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({ views: count() })
    .from(adViewsTable)
    .where(and(eq(adViewsTable.carId, car_id), gte(adViewsTable.viewedAt, since)));

  const views = Number(result.views);

  let tag = "";
  if (views >= 50) tag = "Hot";
  else if (views >= 20) tag = "Popular";

  res.json({ views, tag });
});

export default router;
