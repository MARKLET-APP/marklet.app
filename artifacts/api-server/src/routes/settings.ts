import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }
  res.json({
    ...settings,
    featuredListingPrice: Number(settings.featuredListingPrice),
    premiumSubscriptionPrice: Number(settings.premiumSubscriptionPrice),
  });
});

export default router;
