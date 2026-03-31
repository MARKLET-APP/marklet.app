import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable, fcmTokensTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../lib/auth.js";
import { VAPID_PUBLIC_KEY, sendPushToUser, sendBroadcastPush } from "../services/pushService.js";

const router: IRouter = Router();

router.get("/push/vapid-public-key", (_req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post("/push/subscribe", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { endpoint, keys, userAgent } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription data" });
    return;
  }

  const userId = req.userId!;

  const existing = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].userId !== userId) {
      await db
        .update(pushSubscriptionsTable)
        .set({ userId, p256dh: keys.p256dh, auth: keys.auth })
        .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    }
    res.json({ ok: true, updated: true });
    return;
  }

  await db.insert(pushSubscriptionsTable).values({
    userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: userAgent || null,
  });

  res.status(201).json({ ok: true });
});

router.delete("/push/unsubscribe", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "Endpoint required" });
    return;
  }
  await db
    .delete(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.userId, req.userId!),
        eq(pushSubscriptionsTable.endpoint, endpoint)
      )
    );
  res.json({ ok: true });
});

router.post("/push/fcm-token", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { token, platform } = req.body;
  if (!token) {
    res.status(400).json({ error: "FCM token required" });
    return;
  }

  const userId = req.userId!;
  const plat = platform || "android";

  const existing = await db
    .select()
    .from(fcmTokensTable)
    .where(eq(fcmTokensTable.token, token))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].userId !== userId) {
      await db
        .update(fcmTokensTable)
        .set({ userId, platform: plat, updatedAt: new Date() })
        .where(eq(fcmTokensTable.token, token));
    } else {
      await db
        .update(fcmTokensTable)
        .set({ updatedAt: new Date() })
        .where(eq(fcmTokensTable.token, token));
    }
    res.json({ ok: true, updated: true });
    return;
  }

  await db.insert(fcmTokensTable).values({
    userId,
    token,
    platform: plat,
  });

  res.status(201).json({ ok: true });
});

router.delete("/push/fcm-token", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }
  await db
    .delete(fcmTokensTable)
    .where(
      and(
        eq(fcmTokensTable.userId, req.userId!),
        eq(fcmTokensTable.token, token)
      )
    );
  res.json({ ok: true });
});

router.post("/push/test", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    await sendPushToUser(req.userId!, {
      title: "LAZEMNI 🔔",
      body: "اختبار الإشعارات - يعمل بشكل صحيح!",
      url: "/messages",
      tag: "test-notification",
    });
    res.json({ ok: true, message: "Test notification sent" });
  } catch (err) {
    console.error("[Push] Test error:", err);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

router.get("/push/stats", authMiddleware, adminMiddleware, async (_req, res): Promise<void> => {
  try {
    const [fcmResult] = await db.select({ total: count() }).from(fcmTokensTable);
    const [webResult] = await db.select({ total: count() }).from(pushSubscriptionsTable);
    res.json({
      fcmTokens: fcmResult?.total ?? 0,
      webPushSubscriptions: webResult?.total ?? 0,
      total: (fcmResult?.total ?? 0) + (webResult?.total ?? 0),
    });
  } catch (err) {
    console.error("[Push] Stats error:", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.post("/push/broadcast", authMiddleware, adminMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { title, body, url } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "العنوان والرسالة مطلوبان" });
    return;
  }
  if (title.length > 100 || body.length > 500) {
    res.status(400).json({ error: "العنوان أو الرسالة طويلة جداً" });
    return;
  }
  try {
    const result = await sendBroadcastPush({
      title,
      body,
      url: url || "/",
      tag: "lazemni-broadcast",
    });
    console.log(`[Broadcast] Admin ${req.userId} sent: FCM=${result.fcm}, Web=${result.webpush}, Errors=${result.errors}`);
    res.json({
      ok: true,
      sent: { fcm: result.fcm, webpush: result.webpush },
      errors: result.errors,
    });
  } catch (err) {
    console.error("[Push] Broadcast error:", err);
    res.status(500).json({ error: "فشل إرسال الإشعار" });
  }
});

export default router;
