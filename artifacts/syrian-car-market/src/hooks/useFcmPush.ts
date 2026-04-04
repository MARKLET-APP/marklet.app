import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { withApi } from "@/lib/runtimeConfig";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

async function registerFcmToken(token: string, authToken: string): Promise<void> {
  try {
    await fetch(withApi("/api/push/fcm-token"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: "android" }),
    });
  } catch (err) {
    console.warn("[FCM] Failed to register token:", err);
  }
}

export function useFcmPush() {
  const { user, token } = useAuthStore();
  const registeredRef = useRef(false);
  const userIdRef = useRef<number | null>(null);
  const [, navigate] = useLocation();

  // Always keep the latest navigate in a ref so async listeners use it
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  // ─── STEP 1: Register notification-tap listener immediately on first mount ───
  // This must happen before the registration delay so that cold-start taps
  // (app launched from notification) are captured even if the event fires
  // within the first 1–2 seconds.
  useEffect(() => {
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    if (!isNative) return;

    let listeners: { remove: () => void }[] = [];

    const registerListeners = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Foreground notification received
        const l1 = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[FCM] Notification in foreground:", notification.title);
          }
        );

        // Notification tapped — works for:
        //  • App in foreground
        //  • App in background (resumed)
        //  • App killed (cold start from notification tap)
        const l2 = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = action.notification.data ?? {};
            // Support both "url" and "path" keys sent from admin panel
            const dest: string | undefined = data.url ?? data.path;
            console.log("[FCM] Notification tapped → navigating to:", dest);
            if (dest) {
              const path = dest.startsWith("/") ? dest : `/${dest}`;
              navigateRef.current(path);
            }
          }
        );

        listeners = [l1, l2];
      } catch (err) {
        console.error("[FCM] Listener registration failed:", err);
      }
    };

    registerListeners();

    return () => {
      listeners.forEach((l) => l.remove());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once — listeners stay alive for the app lifetime

  // ─── STEP 2: Request permissions + register FCM token (after user logs in) ───
  useEffect(() => {
    if (!user || !token) {
      registeredRef.current = false;
      userIdRef.current = null;
      return;
    }

    if (registeredRef.current && userIdRef.current === user.id) return;

    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    if (!isNative) return;

    const setup = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permStatus = await PushNotifications.checkPermissions();
        let granted = permStatus.receive === "granted";
        if (!granted) {
          const result = await PushNotifications.requestPermissions();
          granted = result.receive === "granted";
        }

        if (!granted) {
          console.warn("[FCM] Push permission denied");
          return;
        }

        await PushNotifications.register();

        await PushNotifications.addListener("registration", async (fcmToken) => {
          console.log("[FCM] Token received:", fcmToken.value);
          await registerFcmToken(fcmToken.value, token);
          registeredRef.current = true;
          userIdRef.current = user.id;
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", err);
        });
      } catch (err) {
        console.error("[FCM] Setup failed:", err);
      }
    };

    const timeout = setTimeout(setup, 1500);
    return () => clearTimeout(timeout);
  }, [user?.id, token]);
}
