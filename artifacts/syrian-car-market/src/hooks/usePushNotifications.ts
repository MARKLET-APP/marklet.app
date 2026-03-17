import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

async function subscribeUser(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
  token: string
): Promise<void> {
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const sub = subscription.toJSON();
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      userAgent: navigator.userAgent,
    }),
  });
}

export function usePushNotifications() {
  const { user, token } = useAuthStore();
  const subscribedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || !token) {
      subscribedRef.current = false;
      userIdRef.current = null;
      return;
    }

    if (subscribedRef.current && userIdRef.current === user.id) return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const setup = async () => {
      try {
        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) return;

        const permission = Notification.permission;
        if (permission === "denied") return;

        let granted = permission === "granted";
        if (!granted) {
          const result = await Notification.requestPermission();
          granted = result === "granted";
        }

        if (!granted) return;

        const registration = await navigator.serviceWorker.ready;
        await subscribeUser(registration, vapidPublicKey, token);
        subscribedRef.current = true;
        userIdRef.current = user.id;
        console.log("[Push] Subscribed successfully for user", user.id);
      } catch (err) {
        console.error("[Push] Setup failed:", err);
      }
    };

    const timeout = setTimeout(setup, 2000);
    return () => clearTimeout(timeout);
  }, [user?.id, token]);
}
