import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { setSocketServer } from "./lib/socket.js";
import { checkFeatures } from "./utils/checkFeatures.js";
import { db, messagesTable, conversationsTable, junkCarsTable, carPartsTable, buyRequestsTable, notificationsTable } from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
import jwt from "jsonwebtoken";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const JWT_SECRET = process.env.JWT_SECRET || "syrian-car-market-secret-key-2024";

const server = createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

setSocketServer(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    socket.data.userId = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    socket.data.userId = payload.userId;
    next();
  } catch {
    socket.data.userId = null;
    next();
  }
});

io.on("connection", (socket) => {
  const userId: number | null = socket.data.userId;

  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on("join_conversation", async (convId: number) => {
    if (!userId) return;
    try {
      const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
      if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId)) return;
      socket.join(`conv:${convId}`);

      await db.update(messagesTable)
        .set({ status: "seen", isRead: true })
        .where(and(
          eq(messagesTable.conversationId, convId),
          eq(messagesTable.isRead, false),
        ));

      socket.to(`conv:${convId}`).emit("messages_seen", { convId, seenBy: userId });
    } catch (e) {
      console.error("join_conversation error:", e);
    }
  });

  socket.on("leave_conversation", (convId: number) => {
    socket.leave(`conv:${convId}`);
  });

  socket.on("typing_start", ({ convId, userName }: { convId: number; userName: string }) => {
    if (!userId) return;
    socket.to(`conv:${convId}`).emit("user_typing", { convId, userId, userName });
  });

  socket.on("typing_stop", ({ convId }: { convId: number }) => {
    if (!userId) return;
    socket.to(`conv:${convId}`).emit("user_stopped_typing", { convId, userId });
  });
});

async function runFollowupNotifications() {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Check junk cars
    const junkDue = await db.select().from(junkCarsTable)
      .where(and(isNull(junkCarsTable.followupSentAt), lt(junkCarsTable.createdAt, fiveDaysAgo)));
    for (const item of junkDue) {
      await db.update(junkCarsTable).set({ followupSentAt: new Date() }).where(eq(junkCarsTable.id, item.id));
      await db.insert(notificationsTable).values({
        userId: item.sellerId,
        type: "followup_junk",
        message: `هل تم بيع سيارتك المعطوبة ${[item.type, item.model].filter(Boolean).join(" ") || ""}؟ هل ساعدك MARKLET في إتمام الصفقة؟`,
        link: `/junk-cars?followup=${item.id}&table=junk`,
      });
    }

    // Check car parts
    const partsDue = await db.select().from(carPartsTable)
      .where(and(isNull(carPartsTable.followupSentAt), lt(carPartsTable.createdAt, fiveDaysAgo)));
    for (const item of partsDue) {
      await db.update(carPartsTable).set({ followupSentAt: new Date() }).where(eq(carPartsTable.id, item.id));
      await db.insert(notificationsTable).values({
        userId: item.sellerId,
        type: "followup_part",
        message: `هل تم بيع القطعة "${item.name}"؟ هل ساعدك MARKLET في إتمام الصفقة؟`,
        link: `/car-parts?followup=${item.id}&table=parts`,
      });
    }

    // Check buy requests
    const buyDue = await db.select().from(buyRequestsTable)
      .where(and(isNull(buyRequestsTable.followupSentAt), eq(buyRequestsTable.status, "approved"), lt(buyRequestsTable.createdAt, fiveDaysAgo)));
    for (const item of buyDue) {
      await db.update(buyRequestsTable).set({ followupSentAt: new Date() }).where(eq(buyRequestsTable.id, item.id));
      await db.insert(notificationsTable).values({
        userId: item.userId,
        type: "followup_buyreq",
        message: `هل تمكنت من شراء ${[item.brand, item.model].filter(Boolean).join(" ") || "السيارة"} التي طلبتها؟ هل ساعدك MARKLET في إتمام الصفقة؟`,
        link: `/buy-requests?followup=${item.id}&table=buyreq`,
      });
    }

    if (junkDue.length + partsDue.length + buyDue.length > 0) {
      console.log(`[followup] Sent ${junkDue.length + partsDue.length + buyDue.length} follow-up notifications`);
    }
  } catch (e) {
    console.error("[followup] error:", e);
  }
}

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  checkFeatures(app);
  // Run followup check on startup and every 2 hours
  setTimeout(runFollowupNotifications, 5000);
  setInterval(runFollowupNotifications, 2 * 60 * 60 * 1000);
});
