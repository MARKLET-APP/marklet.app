import { useState } from "react";
import { Phone, MessageCircle, Lock, LogIn, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";

const WA_MSG = encodeURIComponent(
  "مرحباً، رأيت إعلانك على MARKLET. هل ما زال متوفراً؟"
);

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00963")) return "+" + digits.slice(2);
  if (digits.startsWith("0963")) return "+" + digits.slice(1);
  if (digits.startsWith("963")) return "+" + digits;
  if (digits.startsWith("0")) return "+963" + digits.slice(1);
  return "+963" + digits;
}

const WA_ICON = (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.556 4.123 1.529 5.856L.057 23.998 6.305 22.53C8.001 23.468 9.94 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.896 0-3.67-.512-5.192-1.407l-.372-.22-3.855.992 1.013-3.744-.243-.389C2.406 15.417 1.818 13.77 1.818 12 1.818 6.58 6.58 1.818 12 1.818c5.42 0 10.182 4.762 10.182 10.182C22.182 17.42 17.42 21.818 12 21.818z" />
  </svg>
);

interface ContactButtonsProps {
  phone?: string | null;
  sellerId?: number | null;
  listingId?: number | null;
  listingTitle?: string;
  size?: "sm" | "lg";
  onInAppMessage?: () => void;
  chatLoading?: boolean;
  eligibleNavigateUrl?: string;
  className?: string;
}

export function ContactButtons({
  phone,
  sellerId,
  listingId,
  listingTitle = "إعلان على MARKLET",
  size = "lg",
  onInAppMessage,
  chatLoading = false,
  eligibleNavigateUrl,
  className = "",
}: ContactButtonsProps) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [startingChat, setStartingChat] = useState(false);

  const phoneClean = phone?.trim() ? formatPhone(phone.trim()) : null;
  const waLink = phoneClean ? `https://wa.me/${phoneClean.replace("+", "")}?text=${WA_MSG}` : null;
  const callLink = phoneClean ? `tel:${phoneClean}` : null;

  const canDirectContact =
    user?.subscriptionActive === true || user?.isFeaturedSeller === true;

  const btnH = size === "lg" ? "h-12 text-base" : "h-10 text-sm";
  const iconSz = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  const handleInAppMessage = async () => {
    if (!user) { navigate("/login"); return; }
    if (onInAppMessage) { onInAppMessage(); return; }
    if (!sellerId) return;
    try {
      setStartingChat(true);
      const token = localStorage.getItem("scm_token");
      const res = await fetch("/api/chats/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sellerId, carId: listingId ?? null }),
      });
      if (res.ok) {
        const conv = await res.json().catch(() => null);
        navigate(conv?.id ? `/messages?conversationId=${conv.id}` : "/messages");
      }
    } catch {
    } finally {
      setStartingChat(false);
    }
  };

  if (!user) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <Button
          onClick={() => navigate("/login")}
          className={`w-full rounded-xl ${btnH} font-bold gap-2 bg-primary text-primary-foreground shadow-lg`}
        >
          <LogIn className={iconSz} />
          سجّل دخولك للتواصل مع البائع
        </Button>
      </div>
    );
  }

  if (!canDirectContact) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <Button
          onClick={handleInAppMessage}
          disabled={chatLoading || startingChat}
          className={`w-full rounded-xl ${btnH} font-bold gap-2 bg-primary text-primary-foreground shadow-lg`}
        >
          {(chatLoading || startingChat)
            ? <Loader2 className={`${iconSz} animate-spin`} />
            : <MessageCircle className={iconSz} />}
          مراسلة عبر التطبيق
        </Button>
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Star className="w-3 h-3 text-amber-500" />
          التواصل المباشر (واتساب / اتصال) للمشتركين والبائعين المميزين فقط
        </p>
      </div>
    );
  }

  if (!phoneClean) {
    if (eligibleNavigateUrl) {
      return (
        <div className={`flex gap-2 ${className}`}>
          <Button
            onClick={() => navigate(eligibleNavigateUrl)}
            className={`flex-1 rounded-xl ${btnH} font-bold gap-2 bg-green-600 hover:bg-green-700 text-white`}
          >
            {WA_ICON}
            واتساب
          </Button>
          <Button
            onClick={() => navigate(eligibleNavigateUrl)}
            variant="outline"
            className={`flex-1 rounded-xl ${btnH} font-bold gap-2 border-2 border-primary text-primary hover:bg-primary/5`}
          >
            <Phone className={iconSz} />
            اتصال
          </Button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <a
        href={waLink!}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl ${btnH} font-bold bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors no-underline`}
        title={`تواصل عبر واتساب — ${listingTitle}`}
      >
        {WA_ICON}
        واتساب
      </a>
      <a
        href={callLink!}
        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl ${btnH} font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors no-underline`}
        title={`اتصل بالبائع — ${phoneClean}`}
      >
        <Phone className={iconSz} />
        اتصال
      </a>
    </div>
  );
}

export function ContactButtonsFixed({
  phone,
  sellerId,
  listingId,
  listingTitle,
}: {
  phone?: string | null;
  sellerId?: number | null;
  listingId?: number | null;
  listingTitle?: string;
}) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [startingChat, setStartingChat] = useState(false);

  const phoneClean = phone?.trim() ? formatPhone(phone.trim()) : null;
  const waLink = phoneClean ? `https://wa.me/${phoneClean.replace("+", "")}?text=${WA_MSG}` : null;
  const callLink = phoneClean ? `tel:${phoneClean}` : null;

  const canDirectContact =
    user?.subscriptionActive === true || user?.isFeaturedSeller === true;

  const handleInAppMessage = async () => {
    if (!user) { navigate("/login"); return; }
    if (!sellerId) return;
    try {
      setStartingChat(true);
      const token = localStorage.getItem("scm_token");
      const res = await fetch("/api/chats/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sellerId, carId: listingId ?? null }),
      });
      if (res.ok) {
        const conv = await res.json().catch(() => null);
        navigate(conv?.id ? `/messages?conversationId=${conv.id}` : "/messages");
      }
    } catch {
    } finally {
      setStartingChat(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-sm border-t shadow-lg px-4 py-3 flex gap-3">
        <Button
          onClick={() => navigate("/login")}
          className="flex-1 h-12 rounded-xl font-bold gap-2 bg-primary text-primary-foreground"
        >
          <LogIn className="w-5 h-5" />
          سجّل دخولك للتواصل
        </Button>
      </div>
    );
  }

  if (!canDirectContact) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-sm border-t shadow-lg px-4 py-3 flex flex-col gap-1.5">
        <Button
          onClick={handleInAppMessage}
          disabled={startingChat}
          className="w-full h-12 rounded-xl font-bold gap-2 bg-primary text-primary-foreground"
        >
          {startingChat
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <MessageCircle className="w-5 h-5" />}
          مراسلة عبر التطبيق
        </Button>
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Star className="w-3 h-3 text-amber-500" />
          التواصل المباشر للمشتركين والبائعين المميزين
        </p>
      </div>
    );
  }

  if (!phoneClean) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-sm border-t shadow-lg px-4 py-3 flex gap-3">
      <a
        href={waLink!}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors no-underline"
      >
        {WA_ICON}
        واتساب
      </a>
      <a
        href={callLink!}
        className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors no-underline bg-background"
      >
        <Phone className="w-5 h-5" />
        اتصال
      </a>
    </div>
  );
}
