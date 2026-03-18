import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { withApi } from "@/lib/runtimeConfig";

export function useStartChat() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startChat = async (targetUserId: number, initialMsg?: string, carId?: number | null) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.id === targetUserId) {
      toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("scm_token");
      const res = await fetch(withApi("/api/chats/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sellerId: targetUserId, carId: carId ?? null }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        if (data?.error === "Cannot start conversation with yourself") {
          toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" });
          return;
        }
        throw new Error(data?.error ?? "فشل فتح المحادثة");
      }
      const suffix = initialMsg ? `&initial=${encodeURIComponent(initialMsg)}` : "";
      navigate(`/messages?conversationId=${data.id}${suffix}`);
    } catch (err: any) {
      toast({ title: err?.message ?? "تعذّر فتح المحادثة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { startChat, loading };
}
