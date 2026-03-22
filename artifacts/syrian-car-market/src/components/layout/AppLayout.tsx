import { ReactNode, useEffect } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DhikrBar } from "@/components/DhikrBar";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { token, setAuth } = useAuthStore();
  const [, navigate] = useLocation();

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

  // ── Swipe-back / Android back-button guard ───────────────────────────────
  // When the user is logged in, the Android edge-swipe or system back-button
  // must not land them on /login or /register. If the popstate navigation
  // goes to an auth page while a token exists, redirect to "/" instead.
  useEffect(() => {
    const guard = () => {
      if (!useAuthStore.getState().token) return;
      const path = window.location.pathname;
      if (path.endsWith("/login") || path.endsWith("/register")) {
        navigate("/");
      }
    };
    window.addEventListener("popstate", guard);
    return () => window.removeEventListener("popstate", guard);
  }, [navigate]);

  // ── Mobile keyboard resize fix (WebView / Android only) ─────────────────
  // When the virtual keyboard opens, innerHeight shrinks and can trigger CSS
  // layout reflows. Setting body height to the current innerHeight each time
  // prevents the viewport "bounce" that causes spurious re-renders.
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const fix = () => {
      document.body.style.height = window.innerHeight + "px";
    };
    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
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
