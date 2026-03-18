import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./index.css";

// ──────────────────────────────────────────────────────────────
// STEP 1: Inject IMMEDIATE loading banner (before React)
// ──────────────────────────────────────────────────────────────
const IS_NATIVE = Capacitor.isNativePlatform();

const loadingBanner = document.createElement("div");
loadingBanner.id = "__diag_loading";
loadingBanner.style.cssText =
  "position:fixed;top:0;left:0;right:0;z-index:999998;" +
  "background:#0f5132;color:#fff;font-family:monospace;font-size:12px;" +
  "padding:6px 12px;text-align:center;letter-spacing:1px;";
loadingBanner.textContent =
  "MARKLET DIAGNOSTIC | Platform: " +
  (IS_NATIVE ? "NATIVE" : "WEB") +
  " | Loading...";
document.body.appendChild(loadingBanner);

// ──────────────────────────────────────────────────────────────
// STEP 2: Console log capture
// ──────────────────────────────────────────────────────────────
const _consoleLogs: string[] = [];
const _origLog = console.log.bind(console);
const _origError = console.error.bind(console);
const _origWarn = console.warn.bind(console);

function patchConsole() {
  ["log", "error", "warn"].forEach((level) => {
    (console as any)[level] = (...args: unknown[]) => {
      _consoleLogs.push(`[${level.toUpperCase()}] ${args.map(String).join(" ")}`);
      if (_consoleLogs.length > 50) _consoleLogs.shift();
      (level === "log" ? _origLog : level === "error" ? _origError : _origWarn)(...args);
    };
  });
}
patchConsole();

// ──────────────────────────────────────────────────────────────
// STEP 3: Error overlay
// ──────────────────────────────────────────────────────────────
function showError(title: string, message: string, stack?: string) {
  const old = document.getElementById("__diag_overlay");
  if (old) old.remove();

  // Remove loading banner
  document.getElementById("__diag_loading")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "__diag_overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:999999;background:#1a0000;" +
    "color:#ff6b6b;font-family:monospace;font-size:12px;" +
    "padding:16px;overflow-y:auto;direction:ltr;text-align:left;" +
    "white-space:pre-wrap;word-break:break-all;";

  const platform = IS_NATIVE ? "NATIVE (Android)" : "WEB";
  const lastLogs = _consoleLogs.slice(-15).join("\n") || "(none)";

  overlay.textContent = [
    "════════════════════════════════",
    "   MARKLET DIAGNOSTIC ERROR",
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
    "── LAST CONSOLE LOGS ────────────",
    lastLogs,
    "",
    "── USER AGENT ───────────────────",
    navigator.userAgent,
    "",
    "════════════════════════════════",
    ">> Tap anywhere to dismiss <<",
  ].join("\n");

  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

// ──────────────────────────────────────────────────────────────
// STEP 4: Global error handlers
// ──────────────────────────────────────────────────────────────
window.addEventListener("error", (event) => {
  showError(
    "UNCAUGHT JS ERROR",
    event.message || String(event.error),
    event.error?.stack,
  );
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  showError("UNHANDLED PROMISE REJECTION", message, stack);
});

// ──────────────────────────────────────────────────────────────
// STEP 5: SERVICE WORKER — disabled
// ──────────────────────────────────────────────────────────────
// (disabled for diagnostic build)
// if (!IS_NATIVE && "serviceWorker" in navigator) { ... }

// ──────────────────────────────────────────────────────────────
// STEP 6: RENDER
// ──────────────────────────────────────────────────────────────
try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("#root element not found in DOM");

  createRoot(rootEl).render(<App />);

  // Remove loading banner after successful render
  setTimeout(() => {
    document.getElementById("__diag_loading")?.remove();
  }, 2000);
} catch (err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  showError("RENDER CRASH", e.message, e.stack);
}
