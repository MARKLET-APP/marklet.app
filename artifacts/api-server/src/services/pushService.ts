import webpush from "web-push";
import { db, pushSubscriptionsTable, fcmTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@marklet.sy";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

async function sendFcmToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!FCM_SERVER_KEY) return;

  const tokens = await db
    .select()
    .from(fcmTokensTable)
    .where(eq(fcmTokensTable.userId, userId));

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      url: payload.url || "/messages",
      tag: payload.tag || "marklet-notification",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    android: {
      notification: {
        icon: "ic_stat_notification",
        color: "#062f2f",
        sound: "default",
        channel_id: "marklet_default",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      priority: "high" as const,
    },
  };

  const sendPromises = tokens.map(async (t) => {
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...message, to: t.token }),
      });
      const result = await response.json() as { success?: number; failure?: number; results?: Array<{ error?: string }> };
      if (result.failure === 1 && result.results?.[0]?.error === "NotRegistered") {
        await db.delete(fcmTokensTable).where(eq(fcmTokensTable.token, t.token));
        console.log("[FCM] Removed expired token for user", userId);
      }
    } catch (err) {
      console.error("[FCM] Failed to send to user", userId, err);
    }
  });

  await Promise.allSettled(sendPromises);
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

export { VAPID_PUBLIC_KEY };
