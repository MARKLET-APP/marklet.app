import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { setSocketServer } from "./lib/socket.js";
import { checkFeatures } from "./utils/checkFeatures.js";
import { db, messagesTable, conversationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  checkFeatures(app);
});
