import { Capacitor } from "@capacitor/core";

export const IS_NATIVE = Capacitor.isNativePlatform();

// In dev → Vite proxies /api/* to localhost backend (API_BASE = "")
// In production on Replit → frontend and api-server are on same domain (API_BASE = "")
// In production on Vercel → set VITE_API_URL to point to Render API server
export const API_BASE: string = import.meta.env.VITE_API_URL || "";

// The production server URL — used to resolve relative image/media URLs in native Capacitor builds
const NATIVE_SERVER = "https://marklet.net";

// Socket.io URL: same server as API in production, undefined = relative in dev
export const SOCKET_URL: string | undefined =
  import.meta.env.VITE_API_URL || undefined;

export function withApi(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

// Resolves image / media URLs correctly for both web and native Capacitor.
// Relative paths like "/api/uploads/..." become absolute on native so the WebView can load them.
export function imgUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const p = url.startsWith("/") ? url : `/${url}`;
  return IS_NATIVE ? `${NATIVE_SERVER}${p}` : p;
}
