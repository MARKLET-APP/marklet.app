import { useEffect } from "react";
import { IS_NATIVE } from "@/lib/runtimeConfig";

/**
 * Requests ALL dangerous Android permissions at app startup (native APK only).
 *
 * Sequence (with small delays so dialogs don't stack):
 *   1. CAMERA          → getUserMedia({ video: true })
 *   2. RECORD_AUDIO    → getUserMedia({ audio: true })
 *   3. POST_NOTIFICATIONS → PushNotifications plugin (handled in useFcmPush)
 *   4. READ_MEDIA_IMAGES / READ_MEDIA_VIDEO → requested by OS on first file-picker use;
 *      we "warm" it here via a one-shot invisible file input focus so Android marks
 *      it as already surfaced to the user.
 *
 * All permissions must also be declared in AndroidManifest.xml.
 */
export function useAndroidPermissions() {
  useEffect(() => {
    if (!IS_NATIVE) return;

    const tid = setTimeout(async () => {
      await requestCamera();
      await delay(700);
      await requestMicrophone();
      await delay(700);
      await requestMediaLibrary();
    }, 1800);

    return () => clearTimeout(tid);
  }, []);
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function requestCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // Denied or not supported — let the user decide when they actually use the camera
  }
}

async function requestMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {}
}

async function requestMediaLibrary() {
  // READ_MEDIA_IMAGES + READ_MEDIA_VIDEO: Android 13+ runtime permissions.
  // Capacitor's WebView triggers them the moment a <input type="file"> is opened.
  // We create a hidden file input, focus it (which surfaces the permission dialog
  // on first run without actually opening the picker), then immediately remove it.
  try {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*,video/*";
    inp.style.cssText = "position:fixed;opacity:0;pointer-events:none;width:0;height:0;";
    document.body.appendChild(inp);
    // dispatchEvent triggers the permission check path inside Capacitor's bridge
    inp.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
    await delay(300);
    document.body.removeChild(inp);
  } catch {}
}
