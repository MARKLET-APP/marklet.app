// UI_ID: AUTH_ENTRY_01
// NAME: اختيار طريقة الدخول
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          prompt: (cb?: (n: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

export default function AuthEntry() {
  const [, navigate] = useLocation();
  const { user, setAuth } = useAuthStore();
  const { toast } = useToast();
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [gsiLoading, setGsiLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google?.accounts) { setGsiLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGsiLoaded(true);
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: "popup",
      });
    };
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch { /* ignore */ }
    };
  }, []);

  const handleGoogleCredential = async (response: { credential: string }) => {
    setGsiLoading(true);
    try {
      const data = await api.post(`${BASE}/api/auth/google`, { idToken: response.credential }) as { user: any; token: string };
      setAuth(data.user, data.token);
      navigate("/");
    } catch (err: any) {
      const msg = err?.message || "فشل تسجيل الدخول عبر غوغل";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setGsiLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast({ title: "غير متاح حالياً", description: "تسجيل الدخول عبر غوغل لم يُفعَّل بعد", variant: "destructive" });
      return;
    }
    if (!gsiLoaded) {
      toast({ title: "جارٍ التحميل...", description: "انتظر لحظة ثم حاول مجدداً" });
      return;
    }
    window.google!.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // On some WebViews One Tap is blocked — fall back to popup via renderButton
        const el = document.getElementById("g_id_signin_btn");
        if (el) {
          el.style.display = "flex";
          el.click();
        }
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-5" dir="rtl">

      {/* Logo + brand */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
          <span className="text-white text-4xl font-black">L</span>
        </div>
        <h1 className="text-3xl font-black text-foreground">LAZEMNI</h1>
        <p className="text-muted-foreground text-sm mt-1">سوق السيارات السوري</p>
      </div>

      {/* Auth method cards */}
      <div className="w-full max-w-sm space-y-3">

        {/* Google */}
        <button
          onClick={handleGoogleClick}
          disabled={gsiLoading}
          className="w-full flex items-center gap-4 bg-card border-2 border-border hover:border-primary/40 active:scale-[.98] rounded-2xl px-5 py-4 shadow-sm transition-all"
        >
          {gsiLoading ? (
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <div className="flex-1 text-right">
            <div className="font-bold text-foreground text-base">تسجيل الدخول عبر غوغل</div>
            <div className="text-xs text-muted-foreground">استخدم حسابك على جهازك</div>
          </div>
        </button>

        {/* Hidden Google Sign-In button (fallback for One Tap) */}
        {GOOGLE_CLIENT_ID && gsiLoaded && (
          <div id="g_id_signin_btn" style={{ display: "none" }}
            ref={el => {
              if (el && window.google?.accounts && !el.dataset.rendered) {
                el.dataset.rendered = "1";
                window.google.accounts.id.renderButton(el, { type: "standard", size: "large", theme: "outline", text: "signin_with", locale: "ar" });
              }
            }}
          />
        )}

        {/* Phone */}
        <button
          onClick={() => navigate("/phone-login")}
          className="w-full flex items-center gap-4 bg-card border-2 border-border hover:border-primary/40 active:scale-[.98] rounded-2xl px-5 py-4 shadow-sm transition-all"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-500">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.37 2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div className="flex-1 text-right">
            <div className="font-bold text-foreground text-base">تسجيل الدخول برقم الهاتف</div>
            <div className="text-xs text-muted-foreground">رقم هاتفك + كلمة المرور</div>
          </div>
        </button>

        {/* Email */}
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center gap-4 bg-card border-2 border-border hover:border-primary/40 active:scale-[.98] rounded-2xl px-5 py-4 shadow-sm transition-all"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-blue-500">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div className="flex-1 text-right">
            <div className="font-bold text-foreground text-base">تسجيل الدخول بالبريد الإلكتروني</div>
            <div className="text-xs text-muted-foreground">بريدك الإلكتروني + كلمة المرور</div>
          </div>
        </button>

      </div>

      {/* Divider + Register */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">إنشاء حساب جديد</Link>
        </p>
      </div>

      {/* Skip */}
      <button onClick={() => navigate("/")} className="mt-4 text-xs text-muted-foreground/60 hover:text-muted-foreground underline">
        تصفح بدون تسجيل دخول
      </button>

    </div>
  );
}
