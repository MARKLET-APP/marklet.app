import { Capacitor } from "@capacitor/core";

export const IS_NATIVE = Capacitor.isNativePlatform();

export const API_BASE = IS_NATIVE ? "https://marklet.replit.app" : "";

export const SOCKET_URL: string | undefined = IS_NATIVE
  ? "https://marklet.replit.app"
  : undefined;

export function withApi(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}
