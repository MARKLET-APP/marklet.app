import {
  db, usersTable, carsTable, carPartsTable, junkCarsTable, rentalCarsTable, notificationsTable,
} from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";

const LISTING_THRESHOLD = 5;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function runFeaturedSellerCheck(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const users = await db
      .select({ id: usersTable.id, isFeaturedSeller: usersTable.isFeaturedSeller })
      .from(usersTable);

    let granted = 0;
    let revoked = 0;

    for (const user of users) {
      const [carRow] = await db
        .select({ c: count() })
        .from(carsTable)
        .where(and(eq(carsTable.sellerId, user.id), gte(carsTable.createdAt, thirtyDaysAgo)));

      const [partRow] = await db
        .select({ c: count() })
        .from(carPartsTable)
        .where(and(eq(carPartsTable.sellerId, user.id), gte(carPartsTable.createdAt, thirtyDaysAgo)));

      const [junkRow] = await db
        .select({ c: count() })
        .from(junkCarsTable)
        .where(and(eq(junkCarsTable.sellerId, user.id), gte(junkCarsTable.createdAt, thirtyDaysAgo)));

      const [rentalRow] = await db
        .select({ c: count() })
        .from(rentalCarsTable)
        .where(and(eq(rentalCarsTable.sellerId, user.id), gte(rentalCarsTable.createdAt, thirtyDaysAgo)));

      const total =
        Number(carRow?.c ?? 0) +
        Number(partRow?.c ?? 0) +
        Number(junkRow?.c ?? 0) +
        Number(rentalRow?.c ?? 0);

      if (!user.isFeaturedSeller && total > LISTING_THRESHOLD) {
        await db
          .update(usersTable)
          .set({ isFeaturedSeller: true })
          .where(eq(usersTable.id, user.id));

        await db.insert(notificationsTable).values({
          userId: user.id,
          type: "badge",
          message:
            "🌟 تهانينا! حصلت على شارة البائع المميز لنشرك أكثر من 5 إعلانات هذا الشهر. يمكنك الآن التواصل مع المشترين مباشرةً عبر واتساب والاتصال.",
          link: "/profile",
        });

        granted++;
      } else if (user.isFeaturedSeller && total === 0) {
        await db
          .update(usersTable)
          .set({ isFeaturedSeller: false })
          .where(eq(usersTable.id, user.id));

        await db.insert(notificationsTable).values({
          userId: user.id,
          type: "badge",
          message:
            "⚠️ تم إلغاء شارة البائع المميز لعدم نشر أي إعلان خلال الشهر الماضي. استمر في النشر للحصول على المزايا مجدداً.",
          link: "/add-listing",
        });

        revoked++;
      }
    }

    if (granted + revoked > 0) {
      console.log(`[featured-seller] Granted: ${granted}, Revoked: ${revoked}`);
    }
  } catch (err) {
    console.error("[featured-seller] Error:", err);
  }
}
