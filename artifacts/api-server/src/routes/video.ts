import { Router, type IRouter } from "express";
import { db, carsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function canGenerateVideo(user: any): boolean {
  if (!user) return false;
  if (user.isPremium === true) return true;
  if (user.role === "dealer" || user.role === "seller") return true;
  if (user.subscriptionActive === true) return true;
  if (user.role === "admin") return true;
  return false;
}

router.post("/generate-ad-video", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user;

  if (!user || !canGenerateVideo(user)) {
    res.status(403).json({
      message: "هذه الميزة متاحة فقط للاشتراك المدفوع",
      requiresPremium: true,
    });
    return;
  }

  const { carId } = req.body;
  if (!carId) {
    res.status(400).json({ error: "carId مطلوب" });
    return;
  }

  const [car] = await db
    .select()
    .from(carsTable)
    .where(eq(carsTable.id, Number(carId)))
    .limit(1);

  if (!car) {
    res.status(404).json({ error: "الإعلان غير موجود" });
    return;
  }

  const [seller] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, car.sellerId)).limit(1);

  const priceFormatted = car.price ? `$${Number(car.price).toLocaleString()}` : "اتصل للسعر";
  const mileageFormatted = car.mileage ? `${Number(car.mileage).toLocaleString()} كم` : "";

  const script = [
    `🚗 ${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}`,
    (car as any).color ? `اللون: ${(car as any).color}` : "",
    mileageFormatted ? `المسافة المقطوعة: ${mileageFormatted}` : "",
    car.city ? `الموقع: ${car.city}` : "",
    `السعر: ${priceFormatted}`,
    car.description ? `\n${car.description}` : "",
    "\n📞 تواصل معنا على MARKLET",
  ].filter(Boolean).join("\n");

  const slides = [
    { order: 1, text: `${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}`, sub: car.city ?? "", duration: 3 },
    { order: 2, text: `السعر: ${priceFormatted}`, sub: mileageFormatted, duration: 3 },
    { order: 3, text: (car as any).color ? `اللون: ${(car as any).color}` : "مواصفات ممتازة", sub: "", duration: 3 },
    { order: 4, text: "للتواصل عبر MARKLET", sub: seller?.phone ?? "", duration: 3 },
  ];

  res.json({
    success: true,
    carId: car.id,
    carTitle: `${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}`,
    script,
    slides,
    generatedAt: new Date().toISOString(),
    note: "يمكنك مشاركة هذا النص كفيديو إعلاني على منصات التواصل الاجتماعي",
  });
});

export default router;
