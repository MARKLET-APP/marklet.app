import { Router, type IRouter } from "express";
import { db, supportMessagesTable, feedbackTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/support", async (req, res): Promise<void> => {
  const { type, message, userId } = req.body;
  if (!type || !message) { res.status(400).json({ error: "type and message are required" }); return; }

  await db.insert(supportMessagesTable).values({
    userId: userId ? Number(userId) : null,
    type,
    message,
  });

  res.status(201).json({ success: true, message: "تم إرسال رسالتك بنجاح" });
});

router.post("/feedback", async (req, res): Promise<void> => {
  const { feedback, userId } = req.body;
  if (!feedback) { res.status(400).json({ error: "feedback is required" }); return; }

  await db.insert(feedbackTable).values({
    userId: userId ? Number(userId) : null,
    feedback,
  });

  res.status(201).json({ success: true, message: "شكراً على ملاحظتك" });
});

router.get("/support", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(supportMessagesTable).orderBy(desc(supportMessagesTable.createdAt));
  res.json(rows);
});

router.get("/feedback", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt));
  res.json(rows);
});

export default router;
