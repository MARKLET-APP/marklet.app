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
