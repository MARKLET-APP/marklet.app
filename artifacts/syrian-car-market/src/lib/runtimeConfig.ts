import { Capacitor } from "@capacitor/core";

export const IS_NATIVE = Capacitor.isNativePlatform();

// In dev → Vite proxies /api/* to localhost backend (API_BASE = "")
// In production on Replit → frontend and api-server are on same domain (API_BASE = "")
// In production on Vercel → set VITE_API_URL to point to Render API server
export const API_BASE: string = import.meta.env.VITE_API_URL || "";

// Socket.io URL: same server as API in production, undefined = relative in dev
export const SOCKET_URL: string | undefined =
  import.meta.env.VITE_API_URL || undefined;

export function withApi(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}
