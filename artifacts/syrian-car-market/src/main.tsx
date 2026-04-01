import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile.css";

// Dev-only: inject token from URL before React mounts (no reload needed)
if (import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search);
  const dt = params.get("debug_token");
  if (dt) {
    localStorage.setItem("scm_token", dt);
    const clean = new URL(window.location.href);
    clean.searchParams.delete("debug_token");
    window.history.replaceState({}, "", clean.toString());
  }
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

// تسجيل Service Worker — يُفعّل دعم العمل دون اتصال ومنع شاشة 404 عند إعادة تشغيل الخادم
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((reg) => {
        // تحديث الـ SW تلقائياً عند وجود نسخة جديدة
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // نسخة جديدة متاحة
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            };
          }
        };
      })
      .catch(() => {
        // SW غير مدعوم أو محجوب — التطبيق يعمل بشكل طبيعي
      });
  });
}
