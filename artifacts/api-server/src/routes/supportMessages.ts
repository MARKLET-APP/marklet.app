import { Router, type IRouter } from "express";
import { db, supportMessagesTable, feedbackTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const AUTO_REPLY = "تم استلام رسالتك، سيقوم فريق LAZEMNI بالرد عليك قريباً. شكراً لملاحظاتك.";

router.post("/support", async (req, res): Promise<void> => {
  const { type, message, userId } = req.body;
  if (!type || !message) { res.status(400).json({ error: "type and message are required" }); return; }

  await db.insert(supportMessagesTable).values({
    userId: userId ? Number(userId) : null,
    type,
    message,
  });

  res.status(201).json({ success: true, message: "تم إرسال رسالتك بنجاح", autoReply: AUTO_REPLY });
});

router.post("/feedback", async (req, res): Promise<void> => {
  const { feedback, userId } = req.body;
  if (!feedback) { res.status(400).json({ error: "feedback is required" }); return; }

  await db.insert(feedbackTable).values({
    userId: userId ? Number(userId) : null,
    feedback,
  });

  res.status(201).json({ success: true, message: "شكراً على ملاحظتك", autoReply: AUTO_REPLY });
});

router.get("/support", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db
    .select({
      id: supportMessagesTable.id,
      userId: supportMessagesTable.userId,
      type: supportMessagesTable.type,
      message: supportMessagesTable.message,
      status: supportMessagesTable.status,
      createdAt: supportMessagesTable.createdAt,
      userName: usersTable.name,
      userPhone: usersTable.phone,
    })
    .from(supportMessagesTable)
    .leftJoin(usersTable, eq(supportMessagesTable.userId, usersTable.id))
    .orderBy(desc(supportMessagesTable.createdAt));
  res.json(rows);
});

router.get("/feedback", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db
    .select({
      id: feedbackTable.id,
      userId: feedbackTable.userId,
      feedback: feedbackTable.feedback,
      createdAt: feedbackTable.createdAt,
      userName: usersTable.name,
    })
    .from(feedbackTable)
    .leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
    .orderBy(desc(feedbackTable.createdAt));
  res.json(rows);
});

export default router;
