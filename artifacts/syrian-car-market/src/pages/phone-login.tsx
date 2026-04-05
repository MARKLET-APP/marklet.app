// UI_ID: PHONE_LOGIN_01
// NAME: تسجيل الدخول برقم الهاتف
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PhoneLogin() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast({ title: "أدخل رقم الهاتف وكلمة المرور", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let data: { user: any; token: string };
      if (mode === "login") {
        data = await api.post(`${BASE}/api/login`, { identifier: phone, password }) as any;
      } else {
        if (!name.trim()) {
          toast({ title: "أدخل اسمك الكامل", variant: "destructive" });
          setLoading(false);
          return;
        }
        data = await api.post(`${BASE}/api/register`, { name, phone, password, role: "buyer" }) as any;
      }
      setAuth(data.user, data.token);
      navigate("/");
    } catch (err: any) {
      const msg = err?.message || (mode === "login" ? "رقم الهاتف أو كلمة المرور غير صحيحة" : "حدث خطأ في إنشاء الحساب");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-5" dir="rtl">
      <div className="w-full max-w-sm">

        {/* Back */}
        <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowRight className="w-4 h-4" />
          خيارات تسجيل الدخول
        </button>

        {/* Title */}
        <div className="mb-8">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-green-500">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.37 2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black">
            {mode === "login" ? "الدخول برقم الهاتف" : "حساب جديد برقم الهاتف"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "أدخل رقمك وكلمة المرور" : "أنشئ حسابك بسهولة"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold">الاسم الكامل</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="محمد أحمد"
                style={{ fontSize: 16 }}
                className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary outline-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold">رقم الهاتف</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="+963 9XX XXX XXXX"
              style={{ fontSize: 16 }}
              className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary outline-none text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold">كلمة المرور</label>
            <div className="relative">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPass ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                style={{ fontSize: 16 }}
                className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr pe-12"
              />
              <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                className="absolute inset-y-0 start-3 flex items-center text-muted-foreground">
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold rounded-xl">
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === "login" ? "جارٍ الدخول..." : "جارٍ إنشاء الحساب..."}
              </span>
            ) : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
          </Button>

        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setMode(m => m === "login" ? "register" : "login")}
            className="text-sm text-primary font-bold hover:underline">
            {mode === "login" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}
          </button>
        </div>

      </div>
    </div>
  );
}
