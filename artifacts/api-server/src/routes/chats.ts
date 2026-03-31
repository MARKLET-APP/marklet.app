import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, conversationsTable, messagesTable, usersTable, carsTable, imagesTable, notificationsTable, blockedUsersTable } from "@workspace/db";
import { sendPushToUser } from "../services/pushService.js";
import sharp from "sharp";
import { eq, and, or, desc, count, isNull } from "drizzle-orm";
import { SendMessageBody, StartConversationBody } from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";
import { getSocketServer } from "../lib/socket.js";

const router: IRouter = Router();

const OFFENSIVE_WORDS = [
  "كلب", "حمار", "خنزير", "عاهرة", "شرموطة", "ابن زانية",
  "منيوك", "كس", "زب", "شرموط", "عرص", "قحبة",
];

function filterContent(text: string): string {
  let filtered = text;
  OFFENSIVE_WORDS.forEach((word) => {
    filtered = filtered.replace(new RegExp(word, "g"), "****");
  });
  return filtered;
}

const chatUploadsDir = path.join(process.cwd(), "uploads", "chat");
if (!fs.existsSync(chatUploadsDir)) fs.mkdirSync(chatUploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

const audioDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const audioUpload = multer({
  storage: audioDiskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = /webm|ogg|mp3|wav|mp4|m4a/;
    const allowedMime = /audio\//;
    if (allowedExt.test(path.extname(file.originalname).toLowerCase()) || allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files allowed"));
    }
  },
});

type ConvRow = { id: number; carId: number | null; buyerId: number; sellerId: number; createdAt: Date; updatedAt: Date };

async function buildConvResponse(conv: ConvRow, userId: number) {
  const isBuyer = conv.buyerId === userId;
  const otherUserId = isBuyer ? conv.sellerId : conv.buyerId;
  const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
  const [car] = conv.carId != null ? await db.select().from(carsTable).where(eq(carsTable.id, conv.carId)).limit(1) : [];
  const [carImg] = conv.carId != null ? await db.select().from(imagesTable).where(eq(imagesTable.carId, conv.carId)).limit(1) : [];
  const [lastMsg] = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(desc(messagesTable.createdAt)).limit(1);
  const [unreadRow] = await db.select({ c: count() }).from(messagesTable).where(and(
    eq(messagesTable.conversationId, conv.id),
    eq(messagesTable.isRead, false),
    eq(messagesTable.senderId, otherUserId),
  ));
  return {
    id: conv.id,
    carId: conv.carId,
    carBrand: car?.brand ?? "",
    carModel: car?.model ?? "",
    carYear: car?.year ?? 0,
    carImage: carImg?.imageUrl ?? null,
    otherUserId,
    otherUserName: otherUser?.name ?? "Unknown",
    otherUserPhone: otherUser?.phone ?? null,
    otherUserPhoto: otherUser?.profilePhoto ?? null,
    lastMessage: lastMsg?.isDeleted ? "تم حذف الرسالة" : (lastMsg?.content ?? null),
    lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
    unreadCount: unreadRow?.c ?? 0,
    createdAt: conv.createdAt,
  };
}

router.get("/chats", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const conversations = await db.select().from(conversationsTable)
    .where(or(eq(conversationsTable.buyerId, userId), eq(conversationsTable.sellerId, userId)))
    .orderBy(desc(conversationsTable.updatedAt));

  const seen = new Set<number>();
  const deduped = conversations.filter(c => {
    const partnerId = c.buyerId === userId ? c.sellerId : c.buyerId;
    if (seen.has(partnerId)) return false;
    seen.add(partnerId);
    return true;
  });

  res.json(await Promise.all(deduped.map((c) => buildConvResponse(c, userId))));
});

router.post("/chats/start", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = StartConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { sellerId, carId = null } = parsed.data;
  const buyerId = req.userId!;
  if (buyerId === sellerId) { res.status(400).json({ error: "Cannot start conversation with yourself" }); return; }
  const [existing] = await db.select().from(conversationsTable).where(
    or(
      and(eq(conversationsTable.buyerId, buyerId), eq(conversationsTable.sellerId, sellerId)),
      and(eq(conversationsTable.buyerId, sellerId), eq(conversationsTable.sellerId, buyerId)),
    )
  ).orderBy(desc(conversationsTable.updatedAt)).limit(1);
  if (existing) { res.status(201).json(await buildConvResponse(existing, buyerId)); return; }
  const [conv] = await db.insert(conversationsTable).values({ buyerId, sellerId, carId: carId ?? null }).returning();
  res.status(201).json(await buildConvResponse(conv, buyerId));
});

router.get("/chats/:conversationId/messages", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const msgs = await db.select({
    id: messagesTable.id,
    conversationId: messagesTable.conversationId,
    senderId: messagesTable.senderId,
    content: messagesTable.content,
    messageType: messagesTable.messageType,
    status: messagesTable.status,
    imageUrl: messagesTable.imageUrl,
    isRead: messagesTable.isRead,
    isDeleted: messagesTable.isDeleted,
    reactions: messagesTable.reactions,
    editedAt: messagesTable.editedAt,
    createdAt: messagesTable.createdAt,
    updatedAt: messagesTable.updatedAt,
    senderName: usersTable.name,
    senderPhoto: usersTable.profilePhoto,
  }).from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  await db.update(messagesTable)
    .set({ status: "seen", isRead: true })
    .where(and(eq(messagesTable.conversationId, convId), eq(messagesTable.isRead, false)));

  const io = getSocketServer();
  if (io) io.to(`conv:${convId}`).emit("messages_seen", { convId, seenBy: req.userId });

  const filteredMsgs = msgs.filter(m => {
    if (m.senderId !== null && m.senderId < 0) {
      return Math.abs(m.senderId) === req.userId;
    }
    return true;
  });
  res.json(filteredMsgs.map((m) => ({
    ...m,
    senderId: m.senderId !== null && m.senderId < 0 ? 0 : m.senderId,
    senderName: m.senderName ?? "Unknown",
    senderPhoto: m.senderPhoto ?? null,
    reactions: (() => { try { return JSON.parse(m.reactions ?? "{}"); } catch { return {}; } })(),
  })));
});

router.post("/chats/:conversationId/messages", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const otherUserId = conv.buyerId === req.userId ? conv.sellerId : conv.buyerId;

  const blocked = await db.select().from(blockedUsersTable).where(or(
    and(eq(blockedUsersTable.userId, req.userId!), eq(blockedUsersTable.blockedUserId, otherUserId)),
    and(eq(blockedUsersTable.userId, otherUserId), eq(blockedUsersTable.blockedUserId, req.userId!)),
  )).limit(1);
  if (blocked.length > 0) { res.status(403).json({ error: "Blocked" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const filteredContent = filterContent(parsed.data.content);
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [msgCountRow] = await db.select({ c: count() }).from(messagesTable).where(eq(messagesTable.conversationId, convId));
  const isFirstMessage = (msgCountRow?.c ?? 0) === 0;

  const [msg] = await db.insert(messagesTable).values({
    conversationId: convId,
    senderId: req.userId!,
    content: filteredContent,
    messageType: parsed.data.messageType ?? "text",
    status: "delivered",
  }).returning();

  await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, convId));

  const fullMsg = { ...msg, senderName: sender?.name ?? "Unknown", senderPhoto: sender?.profilePhoto ?? null, reactions: {} };

  const io = getSocketServer();
  if (io) {
    io.to(`conv:${convId}`).emit("new_message", { convId, message: fullMsg });
    io.to(`user:${otherUserId}`).emit("notification", {
      type: "message",
      message: `رسالة جديدة من ${sender?.name ?? "شخص ما"}`,
      link: `/messages?conversationId=${convId}`,
    });
  }

  await db.insert(notificationsTable).values({
    userId: otherUserId,
    type: "message",
    message: `رسالة جديدة من ${sender?.name ?? "شخص ما"}`,
    link: `/messages?conversationId=${convId}`,
  });

  sendPushToUser(otherUserId, {
    title: `LAZEMNI — رسالة من ${sender?.name ?? "شخص ما"}`,
    body: filteredContent.length > 80 ? filteredContent.slice(0, 80) + "..." : filteredContent,
    url: `/messages?conversationId=${convId}`,
    tag: `msg-conv-${convId}`,
  }).catch((e) => console.error("[Push] text message push error:", e));

  if (isFirstMessage) {
    const [autoMsg] = await db.insert(messagesTable).values({
      conversationId: convId,
      senderId: -req.userId!,
      content: "تم إرسال رسالتك بنجاح. يرجى الانتظار حتى يرد عليك البائع.",
      messageType: "system",
      status: "sent",
    }).returning();
    if (io) {
      const sockets = await io.fetchSockets();
      const senderSocket = sockets.find(s => s.data.userId === req.userId);
      if (senderSocket) {
        senderSocket.emit("new_message", {
          convId,
          message: { ...autoMsg, senderName: "النظام", senderPhoto: null, reactions: {} },
        });
      }
    }
  }

  res.status(201).json(fullMsg);
});

router.post("/chats/:conversationId/messages/image", authMiddleware, upload.single("image"), async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!req.file) { res.status(400).json({ error: "No image provided" }); return; }

  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const compressedPath = path.join(chatUploadsDir, fileName);
  try {
    await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(compressedPath);
  } catch (err) {
    console.error("[Chat] Image compression error:", err);
    res.status(500).json({ error: "فشل معالجة الصورة" });
    return;
  }
  const imageUrl = `/api/uploads/chat/${fileName}`;
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [msg] = await db.insert(messagesTable).values({
    conversationId: convId,
    senderId: req.userId!,
    content: "صورة",
    messageType: "image",
    imageUrl,
    status: "delivered",
  }).returning();
  await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, convId));

  const otherUserIdImg = conv.buyerId === req.userId ? conv.sellerId : conv.buyerId;
  const fullMsg = { ...msg, senderName: sender?.name ?? "Unknown", senderPhoto: sender?.profilePhoto ?? null, reactions: {} };
  const io = getSocketServer();
  if (io) io.to(`conv:${convId}`).emit("new_message", { convId, message: fullMsg });

  sendPushToUser(otherUserIdImg, {
    title: `LAZEMNI — رسالة من ${sender?.name ?? "شخص ما"}`,
    body: "📷 أرسل لك صورة",
    url: `/messages?conversationId=${convId}`,
    tag: `msg-conv-${convId}`,
  }).catch((e) => console.error("[Push] image push error:", e));

  res.status(201).json(fullMsg);
});

router.post("/chats/:conversationId/messages/audio", authMiddleware, audioUpload.single("audio"), async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!req.file) { res.status(400).json({ error: "No audio provided" }); return; }

  const audioUrl = `/api/uploads/chat/${req.file.filename}`;
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const [msg] = await db.insert(messagesTable).values({
    conversationId: convId,
    senderId: req.userId!,
    content: "رسالة صوتية",
    messageType: "audio",
    imageUrl: audioUrl,
    status: "delivered",
  }).returning();
  await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, convId));

  const otherUserId = conv.buyerId === req.userId ? conv.sellerId : conv.buyerId;
  const fullMsg = { ...msg, senderName: sender?.name ?? "Unknown", senderPhoto: sender?.profilePhoto ?? null, reactions: {} };
  const io = getSocketServer();
  if (io) {
    io.to(`conv:${convId}`).emit("new_message", { convId, message: fullMsg });
    io.to(`user:${otherUserId}`).emit("notification", {
      type: "message",
      message: `رسالة صوتية من ${sender?.name ?? "شخص ما"}`,
      link: `/messages?conversationId=${convId}`,
    });
  }

  sendPushToUser(otherUserId, {
    title: `LAZEMNI — رسالة من ${sender?.name ?? "شخص ما"}`,
    body: "🎤 أرسل لك رسالة صوتية",
    url: `/messages?conversationId=${convId}`,
    tag: `msg-conv-${convId}`,
  }).catch((e) => console.error("[Push] audio push error:", e));

  res.status(201).json(fullMsg);
});

router.patch("/chats/:conversationId/messages/:messageId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const msgId = parseInt(Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId, 10);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg || msg.senderId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (Date.now() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000) {
    res.status(400).json({ error: "يمكن تعديل الرسالة خلال 5 دقائق فقط من إرسالها" }); return;
  }
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }
  const [updated] = await db.update(messagesTable)
    .set({ content: filterContent(content.trim()), editedAt: new Date(), updatedAt: new Date() })
    .where(eq(messagesTable.id, msgId)).returning();
  const io = getSocketServer();
  if (io) io.to(`conv:${msg.conversationId}`).emit("message_updated", { convId: msg.conversationId, message: { ...updated, reactions: {} } });
  res.json(updated);
});

router.delete("/chats/:conversationId/messages/:messageId", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const msgId = parseInt(Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId, 10);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg || msg.senderId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [updated] = await db.update(messagesTable)
    .set({ isDeleted: true, content: "تم حذف هذه الرسالة", updatedAt: new Date() })
    .where(eq(messagesTable.id, msgId)).returning();
  const io = getSocketServer();
  if (io) io.to(`conv:${msg.conversationId}`).emit("message_deleted", { convId: msg.conversationId, messageId: msgId });
  res.json(updated);
});

router.post("/chats/:conversationId/messages/:messageId/react", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const msgId = parseInt(Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId, 10);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  const { emoji } = req.body as { emoji?: string };
  if (!emoji) { res.status(400).json({ error: "Emoji required" }); return; }
  let reactions: Record<string, number[]> = {};
  try { reactions = JSON.parse(msg.reactions ?? "{}"); } catch { reactions = {}; }
  const userId = req.userId!;
  const users = reactions[emoji] ?? [];
  if (users.includes(userId)) {
    reactions[emoji] = users.filter((u) => u !== userId);
    if (!reactions[emoji].length) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, userId];
  }
  const [updated] = await db.update(messagesTable)
    .set({ reactions: JSON.stringify(reactions), updatedAt: new Date() })
    .where(eq(messagesTable.id, msgId)).returning();
  const io = getSocketServer();
  if (io) io.to(`conv:${msg.conversationId}`).emit("reaction_updated", { convId: msg.conversationId, messageId: msgId, reactions });
  res.json({ ...updated, reactions });
});

router.post("/chats/:conversationId/block", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const otherUserId = conv.buyerId === req.userId ? conv.sellerId : conv.buyerId;
  const [existing] = await db.select().from(blockedUsersTable).where(and(
    eq(blockedUsersTable.userId, req.userId!),
    eq(blockedUsersTable.blockedUserId, otherUserId),
  )).limit(1);
  if (existing) {
    await db.delete(blockedUsersTable).where(and(
      eq(blockedUsersTable.userId, req.userId!),
      eq(blockedUsersTable.blockedUserId, otherUserId),
    ));
    res.json({ blocked: false });
  } else {
    await db.insert(blockedUsersTable).values({ userId: req.userId!, blockedUserId: otherUserId });
    res.json({ blocked: true });
  }
});

router.get("/chats/:conversationId/block-status", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const otherUserId = conv.buyerId === req.userId ? conv.sellerId : conv.buyerId;
  const [byMe] = await db.select({ c: count() }).from(blockedUsersTable).where(and(
    eq(blockedUsersTable.userId, req.userId!),
    eq(blockedUsersTable.blockedUserId, otherUserId),
  ));
  const [byOther] = await db.select({ c: count() }).from(blockedUsersTable).where(and(
    eq(blockedUsersTable.userId, otherUserId),
    eq(blockedUsersTable.blockedUserId, req.userId!),
  ));
  res.json({ blockedByMe: (byMe?.c ?? 0) > 0, blockedByOther: (byOther?.c ?? 0) > 0 });
});

export default router;
