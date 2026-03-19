import { ReactNode, useEffect } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DhikrBar } from "@/components/DhikrBar";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";

export function AppLayout({ children }: { children: ReactNode }) {
  const { token, setAuth } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    api.auth.me()
      .then((user) => { if (user) setAuth(user, token); })
      .catch((err: any) => {
        // Only logout on definitive 401 (invalid/expired token)
        // Do NOT logout on network errors or 429 — would wipe form data
        if (err?.response?.status === 401 || err?.status === 401) {
          useAuthStore.getState().logout();
        }
      });
  }, [token, setAuth]);

  // ── Mobile keyboard resize fix ───────────────────────────────────────────
  // When the virtual keyboard opens/closes on Android WebView, the viewport
  // shrinks which can cause layout reflows that trigger re-renders and wipe
  // form state. Locking body height to visualViewport prevents this.
  useEffect(() => {
    const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice()) return;

    const applyHeight = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.body.style.minHeight = h + "px";
    };

    applyHeight();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", applyHeight);
      return () => vv.removeEventListener("resize", applyHeight);
    } else {
      window.addEventListener("resize", applyHeight);
      return () => window.removeEventListener("resize", applyHeight);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16 sm:pb-0">
      <Header />
      <DhikrBar />
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
