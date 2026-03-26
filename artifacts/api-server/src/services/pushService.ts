import webpush from "web-push";
import { db, pushSubscriptionsTable, fcmTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import admin from "firebase-admin";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@marklet.sy";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ─── Firebase Admin SDK (FCM v1 API) ─────────────────────────────────────────
let firebaseApp: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM push disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      firebaseApp = admin.apps[0]!;
    }
    console.log("[FCM] Firebase Admin SDK initialized (v1 API)");
    return firebaseApp;
  } catch (err) {
    console.error("[FCM] Failed to init Firebase Admin SDK:", err);
    return null;
  }
}

// Initialize on startup
getFirebaseApp();

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

async function sendFcmV1(token: string, payload: PushPayload): Promise<boolean> {
  const app = getFirebaseApp();
  if (!app) return false;

  const message: admin.messaging.Message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      url: payload.url || "/",
      tag: payload.tag || "marklet-notification",
    },
    android: {
      priority: "high",
      notification: {
        icon: "ic_stat_notification",
        color: "#062f2f",
        sound: "default",
        channelId: "marklet_default",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
  };

  try {
    await admin.messaging(app).send(message);
    return true;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      await db.delete(fcmTokensTable).where(eq(fcmTokensTable.token, token));
      console.log("[FCM] Removed invalid token");
    } else {
      console.error("[FCM] Send error:", error.code, error.message);
    }
    return false;
  }
}

async function sendFcmBatchV1(
  tokens: string[],
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  const app = getFirebaseApp();
  if (!app || tokens.length === 0) return { success: 0, failed: 0 };

  const CHUNK = 500;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    const messages: admin.messaging.MulticastMessage = {
      tokens: chunk,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url || "/",
        tag: payload.tag || "marklet-broadcast",
      },
      android: {
        priority: "high",
        notification: {
          icon: "ic_stat_notification",
          color: "#062f2f",
          sound: "default",
          channelId: "marklet_default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
    };

    try {
      const batchResponse = await admin.messaging(app).sendEachForMulticast(messages);
      totalSuccess += batchResponse.successCount;
      totalFailed += batchResponse.failureCount;

      // Remove invalid tokens
      const expiredTokens: string[] = [];
      batchResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            expiredTokens.push(chunk[idx]);
          }
        }
      });

      for (const token of expiredTokens) {
        await db.delete(fcmTokensTable).where(eq(fcmTokensTable.token, token));
      }
      if (expiredTokens.length > 0) {
        console.log(`[FCM] Removed ${expiredTokens.length} expired tokens`);
      }
    } catch (err) {
      console.error("[FCM Broadcast] Batch error:", err);
      totalFailed += chunk.length;
    }
  }

  return { success: totalSuccess, failed: totalFailed };
}

async function sendFcmToUser(userId: number, payload: PushPayload): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;

  const tokens = await db
    .select()
    .from(fcmTokensTable)
    .where(eq(fcmTokensTable.userId, userId));

  if (tokens.length === 0) return;

  await Promise.allSettled(tokens.map((t) => sendFcmV1(t.token, payload)));
}

async function sendWebPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  if (subscriptions.length === 0) return;

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-96.png",
    url: payload.url || "/messages",
    tag: payload.tag || "marklet-notification",
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notification,
        { TTL: 86400 }
      );
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        console.log("[Push] Removed expired subscription for user", userId);
      } else {
        console.error("[Push] Failed to send to user", userId, err);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  await Promise.allSettled([
    sendWebPushToUser(userId, payload),
    sendFcmToUser(userId, payload),
  ]);
}

export async function sendBroadcastPush(payload: PushPayload): Promise<{ fcm: number; webpush: number; errors: number }> {
  let fcmSent = 0;
  let errors = 0;
  let webPushSent = 0;

  // ── FCM v1 (firebase-admin) ──────────────────────────────────────────────
  const app = getFirebaseApp();
  if (app) {
    try {
      const rows = await db.select().from(fcmTokensTable);
      if (rows.length > 0) {
        const tokens = rows.map((r) => r.token);
        const result = await sendFcmBatchV1(tokens, payload);
        fcmSent = result.success;
        errors += result.failed;
      }
    } catch (err) {
      console.error("[FCM Broadcast] Error:", err);
      errors++;
    }
  }

  // ── Web Push (VAPID) ─────────────────────────────────────────────────────
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
      const subscriptions = await db.select().from(pushSubscriptionsTable);
      const notification = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-96.png",
        url: payload.url || "/",
        tag: payload.tag || "marklet-broadcast",
      });
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notification,
            { TTL: 86400 }
          );
          webPushSent++;
        } catch (err: unknown) {
          const error = err as { statusCode?: number };
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
          } else {
            errors++;
          }
        }
      }
    } catch (err) {
      console.error("[WebPush Broadcast] Error:", err);
      errors++;
    }
  }

  return { fcm: fcmSent, webpush: webPushSent, errors };
}

export { VAPID_PUBLIC_KEY };
