// UI_ID: COMP_HEADER_01
// NAME: الترويسة
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, User, Crown, MessageSquare, X, LogOut, Car, ChevronRight, Globe, Bookmark, Settings2, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useGetConversations } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { withApi } from "@/lib/runtimeConfig";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export function Header() {
  const { user, logout } = useAuthStore();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, lang, setLang, isRTL } = useLanguage();
  const qc = useQueryClient();
  const isHome = location === "/" || location === "" || location === "/reels";

  const isPremium = !!(user as any)?.isPremium || !!(user as any)?.isVerified;

  const { data: conversations } = useGetConversations({
    query: {
      enabled: !!user,
      refetchInterval: 30_000,
      staleTime: 20_000,
    },
  });

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  const { data: notifsList = [] } = useQuery<any[]>({
    queryKey: ["header-notifications"],
    queryFn: async () => {
      const token = localStorage.getItem("scm_token");
      const r = await fetch(withApi("/api/notifications"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.ok ? r.json() : [];
    },
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadNotifs = notifsList.filter((n: any) => !n.isRead).length;

  const handleSubscribeClick = () => {
    toast({
      title: t("nav.subscribeSoon"),
      description: t("nav.subscribeSoonDesc"),
    });
  };

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar");

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/search", label: t("nav.search") },
    { href: "/real-estate", label: "عقارات", icon: Building2 },
    { href: "/jobs", label: "وظائف", icon: Briefcase },
    { href: "/vehicle-info", label: t("nav.vehicleReport") },
    { href: "/buy-requests", label: t("nav.buyRequests") },
    { href: "/rental-cars", label: "سيارات للإيجار" },
    { href: "/support", label: t("nav.contact") },
    ...(user?.role === "admin" ? [{ href: "/admin", label: t("nav.adminPanel"), accent: true }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-panel border-b" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

          <div className="flex items-center gap-2">
            {!isHome ? (
              /* صفحات فرعية: زر رجوع فقط بدون هامبرغر */
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/");
                  }
                }}
                title={t("nav.back")}
                aria-label={t("nav.back")}
              >
                <ChevronRight className={cn("w-5 h-5", !isRTL && "rotate-180")} />
              </Button>
            ) : (
              /* الصفحة الرئيسية: هامبرغر فقط */
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={t("nav.menu")}
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            )}
            <Link
              href="/"
              className="flex items-center gap-2 group"
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); qc.invalidateQueries(); }}
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-md">
                <img
                  src={`${import.meta.env.BASE_URL}icons/icon-96.png`}
                  alt="LAZEMNI Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span className="text-xl font-extrabold tracking-widest" style={{ color: "#F5A623", letterSpacing: "0.08em" }}>
                LAZEMNI
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
            {/* Language toggle – visible on all screens */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-2 sm:px-3 h-8 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"
              title={t("lang.switch")}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("lang.switch")}</span>
              <span className="sm:hidden text-[10px] font-bold">{lang === "ar" ? "EN" : "ع"}</span>
            </Button>

            {user ? (
              <>
                {user.role === "admin" && !location.startsWith("/admin") && (
                  <Link href="/admin">
                    <Button
                      size="sm"
                      className="flex gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold px-3 h-8 shadow-sm"
                      title="لوحة التحكم"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">التحكم</span>
                    </Button>
                  </Link>
                )}
                {!isPremium && user.role !== "admin" && (
                  <Button
                    onClick={handleSubscribeClick}
                    size="sm"
                    className="hidden sm:flex gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold px-3 h-8 shadow-sm shadow-amber-400/30"
                  >
                    <Crown className="w-3.5 h-3.5" /> {t("nav.subscribeNow")}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/favorites")}
                  title="المحفوظات"
                >
                  <Bookmark className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/messages")}
                  title={t("nav.messages")}
                >
                  <MessageSquare className={cn("w-5 h-5", totalUnread > 0 && "text-primary")} />
                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-background">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/notifications")}
                  title="الإشعارات"
                >
                  <Bell className={cn("w-5 h-5", unreadNotifs > 0 && "text-primary")} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-background">
                      {unreadNotifs > 99 ? "99+" : unreadNotifs}
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
                <Link href="/auth" className="text-sm font-medium hover:text-primary transition-colors px-3 py-2">
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  {t("nav.register")}
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
                  <User className="w-4 h-4" /> {t("nav.myAccount")}
                </Link>
                <Link href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground">
                  <Bookmark className="w-4 h-4" /> المحفوظات
                </Link>
                <Link href="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground">
                  <Bell className="w-4 h-4" /> {t("nav.messages")}
                  {totalUnread > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{totalUnread}</span>}
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 transition-colors font-semibold text-destructive w-full text-right"
                >
                  <LogOut className="w-4 h-4" /> {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground">
                  {t("nav.login")}
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold">
                  {t("nav.register")}
                </Link>
              </>
            )}

            {/* Language toggle in mobile menu */}
            <div className="mt-auto pt-4 border-t">
              <button
                onClick={() => { toggleLang(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-foreground w-full"
              >
                <Globe className="w-4 h-4 text-primary" />
                {t("lang.switch")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
