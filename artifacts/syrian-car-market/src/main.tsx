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
