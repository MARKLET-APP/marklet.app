import { ReactNode, useEffect } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { TopBanner } from "@/components/TopBanner";
import { useAuthStore } from "@/lib/auth";

export function AppLayout({ children }: { children: ReactNode }) {
  const { token, setAuth } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    // Validate token by fetching current user
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          useAuthStore.getState().logout();
          return;
        }
        return res.json();
      })
      .then((user) => {
        if (user) {
          setAuth(user, token);
        }
      })
      .catch(() => {
        // silently fail
      });
  }, [token, setAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16 sm:pb-0">
      <TopBanner />
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
