import { Capacitor } from "@capacitor/core";

export const IS_NATIVE = Capacitor.isNativePlatform();

const RENDER_API_URL = "https://marklet-app.onrender.com";

// In dev → Vite proxies /api/* to localhost backend (API_BASE = "")
// In production → uses VITE_API_URL env var, or falls back to Render URL
export const API_BASE: string = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? RENDER_API_URL : "");

// Socket.io URL: same server as API in production, undefined = relative in dev
export const SOCKET_URL: string | undefined =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? RENDER_API_URL : undefined);

export function withApi(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}
