import { Capacitor } from "@capacitor/core";

export const IS_NATIVE = Capacitor.isNativePlatform();

// On native, server.url in capacitor.config.ts loads the live Replit server,
// so API calls use relative paths (empty base) just like on web.
export const API_BASE = "";

export const SOCKET_URL: string | undefined = undefined;

export function withApi(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}
