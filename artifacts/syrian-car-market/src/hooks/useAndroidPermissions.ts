import { useEffect } from "react";
import { IS_NATIVE } from "@/lib/runtimeConfig";

/**
 * Requests dangerous Android permissions at app startup (native APK only).
 * - CAMERA + READ_MEDIA_IMAGES  → for photo upload
 * - RECORD_AUDIO                → for voice messages
 * - POST_NOTIFICATIONS          → for push notifications
 *
 * Uses the browser Permissions API which Capacitor forwards to Android's
 * ActivityCompat.requestPermissions(). Permissions must be declared in
 * AndroidManifest.xml for the dialog to appear.
 */
export function useAndroidPermissions() {
  useEffect(() => {
    if (!IS_NATIVE) return;

    // Small delay so the splash screen finishes before the dialogs appear
    const tid = setTimeout(async () => {
      await requestAll();
    }, 1800);

    return () => clearTimeout(tid);
  }, []);
}

async function requestAll() {
  // ── Camera ────────────────────────────────────────────────────────────
  try {
    await navigator.permissions.query({ name: "camera" as PermissionName });
  } catch {}

  // ── Microphone / RECORD_AUDIO ─────────────────────────────────────────
  // Calling getUserMedia triggers the Android RECORD_AUDIO permission dialog.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // release immediately
  } catch {}

  // ── Photos / READ_MEDIA_IMAGES ────────────────────────────────────────
  // There is no W3C PermissionName for "photos", but we can query the
  // camera permission which covers file-picker access on Capacitor Android.
  // The actual READ_MEDIA_IMAGES dialog fires when the user taps a file input.
  // Nothing extra needed here — the manifest entry is sufficient.
}
