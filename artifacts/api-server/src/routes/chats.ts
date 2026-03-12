import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, usersTable, carsTable, imagesTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { SendMessageBody, StartConversationBody } from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/chats", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const conversations = await db.select()
    .from(conversationsTable)
    .where(or(eq(conversationsTable.buyerId, userId), eq(conversationsTable.sellerId, userId)))
    .orderBy(desc(conversationsTable.updatedAt));

  const enriched = await Promise.all(conversations.map(async (conv) => {
    const isbuyer = conv.buyerId === userId;
    const otherUserId = isbuyer ? conv.sellerId : conv.buyerId;

    const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, conv.carId)).limit(1);
    const [carImg] = await db.select().from(imagesTable).where(eq(imagesTable.carId, conv.carId)).limit(1);
    
    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);

    const unreadMessages = await db.select().from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, conv.id),
        eq(messagesTable.isRead, false),
        eq(messagesTable.senderId, otherUserId)
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
      otherUserPhoto: otherUser?.profilePhoto ?? null,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
      unreadCount: unreadMessages.length,
      createdAt: conv.createdAt,
    };
  }));

  res.json(enriched);
});

router.post("/chats/start", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const parsed = StartConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sellerId, carId } = parsed.data;
  const buyerId = req.userId!;

  if (buyerId === sellerId) {
    res.status(400).json({ error: "Cannot start conversation with yourself" });
    return;
  }

  const [existing] = await db.select().from(conversationsTable)
    .where(and(
      eq(conversationsTable.buyerId, buyerId),
      eq(conversationsTable.sellerId, sellerId),
      eq(conversationsTable.carId, carId)
    )).limit(1);

  if (existing) {
    const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
    const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, sellerId)).limit(1);
    const [carImg] = await db.select().from(imagesTable).where(eq(imagesTable.carId, carId)).limit(1);
    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, existing.id))
      .orderBy(desc(messagesTable.createdAt)).limit(1);

    res.status(201).json({
      id: existing.id,
      carId,
      carBrand: car?.brand ?? "",
      carModel: car?.model ?? "",
      carYear: car?.year ?? 0,
      carImage: carImg?.imageUrl ?? null,
      otherUserId: sellerId,
      otherUserName: seller?.name ?? "Unknown",
      otherUserPhoto: seller?.profilePhoto ?? null,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
      unreadCount: 0,
      createdAt: existing.createdAt,
    });
    return;
  }

  const [conv] = await db.insert(conversationsTable).values({ buyerId, sellerId, carId }).returning();
  
  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId)).limit(1);
  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, sellerId)).limit(1);
  const [carImg] = await db.select().from(imagesTable).where(eq(imagesTable.carId, carId)).limit(1);

  res.status(201).json({
    id: conv.id,
    carId,
    carBrand: car?.brand ?? "",
    carModel: car?.model ?? "",
    carYear: car?.year ?? 0,
    carImage: carImg?.imageUrl ?? null,
    otherUserId: sellerId,
    otherUserName: seller?.name ?? "Unknown",
    otherUserPhoto: seller?.profilePhoto ?? null,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: conv.createdAt,
  });
});

router.get("/chats/:conversationId/messages", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const msgs = await db.select({
    id: messagesTable.id,
    conversationId: messagesTable.conversationId,
    senderId: messagesTable.senderId,
    content: messagesTable.content,
    messageType: messagesTable.messageType,
    isRead: messagesTable.isRead,
    createdAt: messagesTable.createdAt,
    senderName: usersTable.name,
  })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(eq(messagesTable.conversationId, convId), eq(messagesTable.isRead, false)));

  res.json(msgs.map(m => ({ ...m, senderName: m.senderName ?? "Unknown" })));
});

router.post("/chats/:conversationId/messages", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const convId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv || (conv.buyerId !== req.userId && conv.sellerId !== req.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  const [msg] = await db.insert(messagesTable).values({
    conversationId: convId,
    senderId: req.userId!,
    content: parsed.data.content,
    messageType: parsed.data.messageType ?? "text",
  }).returning();

  await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, convId));

  res.status(201).json({
    ...msg,
    senderName: sender?.name ?? "Unknown",
  });
});

export default router;
