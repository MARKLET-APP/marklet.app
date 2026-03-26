import { useEffect, useRef } from "react";
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

        PushNotifications.addListener("registration", async (fcmToken) => {
          console.log("[FCM] Token received:", fcmToken.value);
          await registerFcmToken(fcmToken.value, token);
          registeredRef.current = true;
          userIdRef.current = user.id;
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", err);
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[FCM] Notification received in foreground:", notification);
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const url = action.notification.data?.url;
          if (url) {
            window.location.hash = url;
          }
        });
      } catch (err) {
        console.error("[FCM] Setup failed:", err);
      }
    };

    const timeout = setTimeout(setup, 1500);
    return () => clearTimeout(timeout);
  }, [user?.id, token]);
}
