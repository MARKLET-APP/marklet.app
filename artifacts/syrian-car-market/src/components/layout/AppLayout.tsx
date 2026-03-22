import { ReactNode, useEffect, useRef } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DhikrBar } from "@/components/DhikrBar";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { PullToRefresh } from "@/components/PullToRefresh";

export function AppLayout({ children }: { children: ReactNode }) {
  const { token, setAuth } = useAuthStore();
  const [, navigate] = useLocation();
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    api.auth.me()
      .then((user) => { if (user) setAuth(user, token); })
      .catch((err: any) => {
        if (err?.response?.status === 401 || err?.status === 401) {
          useAuthStore.getState().logout();
        }
      });
  }, [token, setAuth]);

  // ── Swipe-back / Android back-button guard ────────────────────────────────
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

  // ── Viewport height + pull-to-refresh top offset ─────────────────────────
  useEffect(() => {
    const fix = () => {
      document.documentElement.style.setProperty("--vh", `${window.innerHeight}px`);
      // --ptr-top: distance from viewport top to the bottom of Header+DhikrBar
      // Used by PullToRefresh to position the indicator correctly.
      if (topRef.current) {
        const h = topRef.current.getBoundingClientRect().bottom;
        document.documentElement.style.setProperty("--ptr-top", `${h}px`);
      }
    };
    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
  }, []);

  return (
    /*
     * KEY LAYOUT ARCHITECTURE
     * ──────────────────────────────────────────────────────────────────────
     * The outer div is exactly the visible viewport height (--vh).
     * All four children (Header, DhikrBar, main, BottomNav) are flex items
     * stacked vertically. BottomNav is NOT fixed — it is a real flex child
     * at the bottom of the stack.
     *
     * This means:
     *   • There is ZERO overlap between content and the bottom nav.
     *   • main gets exactly the remaining space (flex-1 + min-h-0).
     *   • Pages that need vertical scroll add overflow-y-auto on their root.
     *   • Chat (and other full-height pages) use h-full and get the exact
     *     available height with no arithmetic needed.
     */
    <div
      className="flex flex-col bg-background overflow-hidden"
      style={{ height: "var(--vh, 100dvh)" }}
    >
      {/* Wrap header + dhikrbar so we can measure their combined height */}
      <div ref={topRef} className="flex-shrink-0">
        <Header />
        <DhikrBar />
      </div>

      {/* Pull-to-refresh indicator — positioned just below the header section */}
      <PullToRefresh />

      <main
        id="app-main"
        className="flex-1 min-h-0 w-full max-w-7xl mx-auto overflow-y-auto"
      >
        {children}
      </main>

      {/* BottomNav renders as a flex child — never overlaps content */}
      <BottomNav />
    </div>
  );
}
