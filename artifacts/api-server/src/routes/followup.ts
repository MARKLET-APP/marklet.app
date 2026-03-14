import { Router, type IRouter } from "express";
import { db, junkCarsTable, carPartsTable, buyRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.patch("/followup-respond", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { table, id, response } = req.body as { table: string; id: number; response: "yes" | "no" };

  if (!["yes", "no"].includes(response)) {
    res.status(400).json({ error: "invalid response" });
    return;
  }

  if (table === "junk") {
    const [item] = await db.select().from(junkCarsTable).where(eq(junkCarsTable.id, id)).limit(1);
    if (!item || item.sellerId !== req.user!.id) { res.status(403).json({ error: "forbidden" }); return; }
    await db.update(junkCarsTable).set({ soldConfirmed: response }).where(eq(junkCarsTable.id, id));
  } else if (table === "parts") {
    const [item] = await db.select().from(carPartsTable).where(eq(carPartsTable.id, id)).limit(1);
    if (!item || item.sellerId !== req.user!.id) { res.status(403).json({ error: "forbidden" }); return; }
    await db.update(carPartsTable).set({ soldConfirmed: response }).where(eq(carPartsTable.id, id));
  } else if (table === "buyreq") {
    const [item] = await db.select().from(buyRequestsTable).where(eq(buyRequestsTable.id, id)).limit(1);
    if (!item || item.userId !== req.user!.id) { res.status(403).json({ error: "forbidden" }); return; }
    await db.update(buyRequestsTable).set({ soldConfirmed: response }).where(eq(buyRequestsTable.id, id));
  } else {
    res.status(400).json({ error: "unknown table" });
    return;
  }

  res.json({ success: true });
});

export default router;
