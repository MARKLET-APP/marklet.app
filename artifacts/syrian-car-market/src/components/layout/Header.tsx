import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, User, Crown, MessageSquare, X, LogOut, Car, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useGetConversations } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, logout } = useAuthStore();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location === "/" || location === "";

  const isPremium = !!(user as any)?.isPremium || !!(user as any)?.isVerified;

  const { data: conversations } = useGetConversations({
    query: {
      enabled: !!user,
      refetchInterval: 30_000,
      staleTime: 20_000,
    },
  });

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  const handleSubscribeClick = () => {
    toast({
      title: "الاشتراك قريباً",
      description: "ميزة الاشتراك المدفوع ستكون متاحة قريباً — ابقَ بانتظارنا!",
    });
  };

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/search", label: "البحث" },
    { href: "/vehicle-info", label: "تقرير مركبة" },
    { href: "/buy-requests", label: "طلبات الشراء" },
    { href: "/support", label: "تواصل معنا" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "لوحة التحكم", accent: true }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-panel border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2">
            {!isHome && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => window.history.back()}
                title="رجوع"
                aria-label="رجوع"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="القائمة"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <img
                  src={`${import.meta.env.BASE_URL}images/logo.png`}
                  alt="MARKLET Logo"
                  className="w-8 h-8 object-contain drop-shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <Car className="w-5 h-5 text-primary hidden" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                MARKLET
              </span>
            </Link>
          </div>

          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("text-sm font-semibold hover:text-primary transition-colors", l.accent && "text-accent hover:text-accent/80")}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {!isPremium && (
                  <Button
                    onClick={handleSubscribeClick}
                    size="sm"
                    className="hidden sm:flex gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold px-3 h-8 shadow-sm shadow-amber-400/30"
                  >
                    <Crown className="w-3.5 h-3.5" /> اشترك الآن
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/messages")}
                  title="الرسائل والإشعارات"
                >
                  {totalUnread > 0 ? (
                    <MessageSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-background">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </Button>

                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full font-medium hover:bg-secondary/80 transition-colors"
                >
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>{user.name}</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors px-3 py-2">
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  إنشاء حساب
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-16 right-0 w-72 h-full bg-card border-l shadow-2xl flex flex-col p-6 gap-2 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {user && (
              <div className="flex items-center gap-3 pb-4 mb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {user.profilePhoto
                    ? <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                    : <User className="w-6 h-6 text-primary" />
                  }
                </div>
                <div>
                  <p className="font-bold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email || user.phone}</p>
                </div>
              </div>
            )}

            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground", l.accent && "text-accent")}
              >
                {l.label}
              </Link>
            ))}

            {user ? (
              <>
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground">
                  <User className="w-4 h-4" /> حسابي
                </Link>
                <Link href="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground">
                  <Bell className="w-4 h-4" /> الرسائل
                  {totalUnread > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{totalUnread}</span>}
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 transition-colors font-semibold text-destructive w-full text-right"
                >
                  <LogOut className="w-4 h-4" /> تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground">
                  تسجيل الدخول
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold">
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
