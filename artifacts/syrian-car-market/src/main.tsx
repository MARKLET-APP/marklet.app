import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./index.css";

// ──────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ──────────────────────────────────────────────────────────────

const IS_NATIVE = Capacitor.isNativePlatform();

function showError(title: string, message: string, stack?: string) {
  // Remove any previous overlay
  const old = document.getElementById("__diag_overlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "__diag_overlay";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:999999",
    "background:#1a0000",
    "color:#ff6b6b",
    "font-family:monospace",
    "font-size:13px",
    "padding:16px",
    "overflow-y:auto",
    "direction:ltr",
    "text-align:left",
    "white-space:pre-wrap",
    "word-break:break-all",
  ].join(";");

  const ua = navigator.userAgent;
  const platform = IS_NATIVE ? "NATIVE (Android/iOS)" : "WEB";

  overlay.textContent = [
    "════════════════════════════════",
    "  MARKLET DIAGNOSTIC ERROR",
    "════════════════════════════════",
    "",
    `TYPE:      ${title}`,
    `PLATFORM:  ${platform}`,
    `TIME:      ${new Date().toISOString()}`,
    "",
    "── MESSAGE ──────────────────────",
    message || "(no message)",
    "",
    "── STACK ────────────────────────",
    stack || "(no stack)",
    "",
    "── USER AGENT ───────────────────",
    ua,
    "",
    "════════════════════════════════",
    "Tap anywhere to dismiss",
  ].join("\n");

  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

// Global JS error handler
window.addEventListener("error", (event) => {
  showError(
    "UNCAUGHT ERROR",
    event.message || String(event.error),
    event.error?.stack,
  );
});

// Unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error
    ? reason.message
    : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  showError("UNHANDLED PROMISE REJECTION", message, stack);
});

// ──────────────────────────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────────────────────────

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element #root not found in DOM");

  createRoot(rootEl).render(<App />);
} catch (err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  showError("RENDER CRASH", e.message, e.stack);
}

// ──────────────────────────────────────────────────────────────
// SERVICE WORKER — disabled in diagnostic build
// ──────────────────────────────────────────────────────────────
// (intentionally commented out for diagnostic purposes)
// if (!IS_NATIVE && "serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/sw.js").catch(() => {});
//   });
// }
