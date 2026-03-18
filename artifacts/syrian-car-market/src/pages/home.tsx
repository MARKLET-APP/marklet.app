import { useState } from "react";
import { Link, useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import {
  Search, ChevronLeft, PlusCircle, ShoppingCart,
  Car, Key, Bike, Hash, Wrench, Package, Shield, SearchIcon, ShoppingCart as CartIcon,
  AlertTriangle, MapPin, DollarSign, MessageCircle, Eye, Send, FileText, Calendar, Flag,
  Building2, Star, Zap, ShieldCheck, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CarCard } from "@/components/CarCard";
import { useGetFeaturedCars, useListCars } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { useStartChat } from "@/hooks/use-start-chat";

export default function Home() {
  const { data: featuredCars, isLoading: loadingFeatured } = useGetFeaturedCars();
  const { data: latestCars, isLoading: loadingLatest } = useListCars({ limit: 6, sortBy: 'createdAt:desc' });
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t, isRTL } = useLanguage();

  const [heroSearch, setHeroSearch] = useState("");
  const [heroProvince, setHeroProvince] = useState("");
  const [missingInfoOpen, setMissingInfoOpen] = useState(false);
  const [missingInfoCarId, setMissingInfoCarId] = useState<number | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [sendingInfo, setSendingInfo] = useState(false);
  const { startChat, loading: startingChat } = useStartChat();
  const [detailRequest, setDetailRequest] = useState<any | null>(null);

  const startChatWithBuyer = (targetUserId: number, _requestId: number, initialMsg?: string) =>
    startChat(targetUserId, initialMsg);

  const { data: buyRequests = [] } = useQuery({
    queryKey: ["/buy-requests"],
    queryFn: () => api.buyRequests.list(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: missingCars = [] } = useQuery({
    queryKey: ["/missing-cars"],
    queryFn: () => api.missingCars.list(),
    staleTime: 60_000,
  });

  const handleSendMissingInfo = async () => {
    if (!infoMsg.trim()) return;
    setSendingInfo(true);
    try {
      await api.support.send({
        type: "missing_car",
        message: `معلومات عن سيارة مفقودة #${missingInfoCarId}: ${infoMsg}`,
        userId: user?.id ?? null,
      });
      toast({ title: t("home.missingInfo.success"), description: t("home.missingInfo.successDesc") });
      setMissingInfoOpen(false);
      setInfoMsg("");
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSendingInfo(false);
    }
  };

  const categories = [
    { id: 'new',        label: isRTL ? 'جديدة'        : 'New',         href: '/new-cars',      bg: '#dcfce7', color: '#16a34a', icon: <Car size={22} /> },
    { id: 'used',       label: isRTL ? 'مستعملة'      : 'Used',        href: '/used-cars',     bg: '#fef9c3', color: '#ca8a04', icon: <Car size={22} /> },
    { id: 'rent',       label: isRTL ? 'إيجار'         : 'Rent',        href: '/rental-cars',   bg: '#dbeafe', color: '#2563eb', icon: <Key size={22} /> },
    { id: 'bikes',      label: isRTL ? 'دراجات'        : 'Bikes',       href: '/motorcycles',   bg: '#fce7f3', color: '#db2777', icon: <Bike size={22} /> },
    { id: 'plates',     label: isRTL ? 'لوحات'         : 'Plates',      href: '/plates',        bg: '#ede9fe', color: '#7c3aed', icon: <Hash size={22} /> },
    { id: 'parts',      label: isRTL ? 'قطع غيار'      : 'Parts',       href: '/car-parts',     bg: '#ffedd5', color: '#ea580c', icon: <Wrench size={22} /> },
    { id: 'junk',       label: isRTL ? 'سكراب'         : 'Junk',        href: '/junk-cars',     bg: '#f1f5f9', color: '#64748b', icon: <Package size={22} /> },
    { id: 'inspect',    label: isRTL ? 'فحص'           : 'Inspect',     href: '/inspections',   bg: '#ecfdf5', color: '#059669', icon: <Shield size={22} /> },
    { id: 'missing',    label: isRTL ? 'مفقودة'        : 'Missing',     href: '/missing-cars',  bg: '#fef2f2', color: '#dc2626', icon: <SearchIcon size={22} /> },
    { id: 'buy',        label: isRTL ? 'طلب شراء'      : 'Buy Req.',    href: '/buy-requests',  bg: '#f0fdf4', color: '#16a34a', icon: <CartIcon size={22} /> },
    { id: 'auctions',   label: isRTL ? 'مزادات'        : 'Auctions',    href: '/auctions',      bg: '#fdf4ff', color: '#a21caf', icon: <Flag size={22} /> },
    { id: 'showrooms',  label: isRTL ? 'معارض'         : 'Showrooms',   href: '/showroom/1',    bg: '#fff7ed', color: '#c2410c', icon: <Building2 size={22} /> },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>

      {/* ══════════════ HERO ══════════════ */}
      <section
        className="relative w-full flex items-center justify-center overflow-hidden text-white"
        style={{
          background: "linear-gradient(145deg, #062f2f 0%, #0f5132 50%, #1c3d2b 100%)",
          paddingTop: 48,
          paddingBottom: 36,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* Ambient glow blobs */}
        <div className="absolute w-80 h-80 rounded-full pointer-events-none"
          style={{ top: "-20%", right: "-5%", background: "radial-gradient(circle, rgba(22,163,74,0.18) 0%, transparent 70%)" }} />
        <div className="absolute w-60 h-60 rounded-full pointer-events-none"
          style={{ bottom: "-10%", left: "-5%", background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)" }} />

        <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-4">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            {isRTL ? "بيع • شراء • تأجير" : "Buy • Sell • Rent"}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: "clamp(38px, 9vw, 56px)",
            fontWeight: 900,
            color: "#d4af37",
            letterSpacing: "2px",
            lineHeight: 1.1,
            textShadow: "0 2px 24px rgba(212,175,55,0.35)",
          }}>
            MARKLET
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(15px, 3.5vw, 20px)", color: "#fff", opacity: 0.9, marginTop: 4 }}
            className="font-semibold">
            {isRTL ? "السوق الذكي للسيارات في سوريا" : "The Smart Car Market in Syria"}
          </p>

          {/* Search form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams();
              if (heroSearch) params.set("q", heroSearch);
              if (heroProvince) params.set("province", heroProvince);
              navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
            }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex items-stretch mt-2"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}
          >
            <div className="flex-1 flex items-center px-4 gap-2 min-w-0">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={isRTL ? "ماركة، موديل..." : "Brand, model..."}
                className="w-full bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 text-sm py-3"
              />
            </div>
            <select
              value={heroProvince}
              onChange={(e) => setHeroProvince(e.target.value)}
              className="border-r border-l border-gray-100 bg-transparent text-gray-600 text-sm px-3 outline-none cursor-pointer shrink-0 hidden sm:block"
              style={{ direction: "rtl" }}
            >
              <option value="">{isRTL ? "كل المحافظات" : "All Regions"}</option>
              {["دمشق","حلب","حمص","اللاذقية","حماة","دير الزور","طرطوس","إدلب"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="submit"
              className="bg-primary text-white font-bold text-sm px-5 shrink-0 hover:bg-primary/90 transition-colors">
              {isRTL ? "بحث" : "Search"}
            </button>
          </form>

          {/* CTA buttons — side by side */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
            <button
              onClick={() => navigate("/add-listing")}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/30 transition-all text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              {isRTL ? "نشر إعلان" : "Post Ad"}
            </button>
            <button
              onClick={() => { if (!user) { navigate("/login"); return; } navigate("/buy-requests"); }}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl border border-white/30 transition-all text-sm backdrop-blur-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              {isRTL ? "طلب شراء" : "Buy Request"}
            </button>
          </div>

        </div>
      </section>

      {/* ══════════════ TRUST STRIP ══════════════ */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto">
          {[
            { icon: <ShieldCheck className="w-4 h-4 text-green-600" />, text: isRTL ? "إعلانات موثوقة" : "Verified Ads" },
            { icon: <Zap className="w-4 h-4 text-yellow-500" />, text: isRTL ? "نشر سريع" : "Fast Posting" },
            { icon: <Sparkles className="w-4 h-4 text-purple-500" />, text: isRTL ? "ذكاء اصطناعي" : "AI-Powered" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-gray-600">
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ CATEGORIES ══════════════ */}
      <section className="py-6 px-4 max-w-3xl mx-auto w-full">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          {isRTL ? "تصفح حسب الفئة" : "Browse by Category"}
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all group"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: cat.bg, color: cat.color }}
              >
                {cat.icon}
              </div>
              <span className="text-[10px] font-bold text-center text-gray-700 leading-tight line-clamp-2">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════ FEATURED CARS ══════════════ */}
      <section className="py-6 bg-gray-50/70 w-full">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="text-base font-bold text-gray-800">{t("home.featured.title")}</h2>
            </div>
            <Link href="/search?featured=true"
              className="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline">
              {t("common.all")} <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Array.isArray(featuredCars) ? featuredCars : []).slice(0, 3).map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ FEATURED SHOWROOMS ══════════════ */}
      <FeaturedShowrooms isRTL={isRTL} />

      {/* ══════════════ LATEST CARS ══════════════ */}
      <section className="py-6 max-w-3xl mx-auto px-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-6 bg-accent rounded-full" />
            <h2 className="text-base font-bold text-gray-800">{t("home.recentCars.title")}</h2>
          </div>
          <Link href="/search"
            className="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline">
            {isRTL ? "تصفح الكل" : "View All"} <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingLatest ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(latestCars?.cars) ? latestCars!.cars : []).map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* ══════════════ BUY REQUESTS ══════════════ */}
      {(buyRequests as any[]).length > 0 && (
        <section className="py-6 bg-primary/5 w-full">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full" />
                <div>
                  <h2 className="text-base font-bold text-gray-800">{t("home.buyReqs.title")}</h2>
                  <p className="text-xs text-gray-500">{t("home.buyReqs.subtitle")}</p>
                </div>
              </div>
              <Link href="/buy-requests" className="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline">
                {t("home.buyReqs.viewAll")} <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(buyRequests as any[]).slice(0, 4).map((r: any) => (
                <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">
                        {r.brand || t("home.buyReqs.anyBrand")} {r.model || ""}
                      </h3>
                      {(r.minYear || r.maxYear) && (
                        <p className="text-xs text-gray-400 mt-0.5">{r.minYear ?? "—"} – {r.maxYear ?? "—"}</p>
                      )}
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0">
                      {t("nav.buyRequests")}
                    </Badge>
                  </div>

                  {r.maxPrice && (
                    <p className="text-sm font-bold text-primary flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {isRTL ? "حتى" : "Up to"} {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}
                    </p>
                  )}

                  {r.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">{r.description}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 rounded-xl gap-1 bg-primary hover:bg-primary/90 text-xs font-bold h-8"
                      disabled={startingChat}
                      onClick={() => startChatWithBuyer(r.userId, r.id, `مرحباً، رأيت طلب الشراء الخاص بك.`)}>
                      <MessageCircle className="w-3 h-3" />
                      {t("home.buyReqs.contact")}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8 px-3"
                      onClick={() => setDetailRequest(r)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ SOCIAL FOLLOW ══════════════ */}
      <section className="py-6 px-4 max-w-3xl mx-auto w-full">
        <div className="bg-gradient-to-br from-primary/8 to-accent/8 rounded-2xl p-5 border border-primary/10">
          <div className="text-center mb-4">
            <h2 className="text-base font-bold text-gray-800">
              {isRTL ? "تابع MARKLET" : "Follow MARKLET"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRTL ? "ابقَ على اطلاع بأحدث الإعلانات" : "Stay updated with latest listings"}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => toast({ title: isRTL ? "قريباً" : "Coming Soon" })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1877F2] text-white font-bold text-xs hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
            <a href="https://www.instagram.com/marklet_official/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-bold text-xs hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>
            <a href="https://whatsapp.com/channel/0029Vb7vvIf65yD3DNRPrG2Z" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a href="https://www.tiktok.com/@marklet_official" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#010101] text-white font-bold text-xs hover:opacity-80 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>
              TikTok
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════ MISSING CARS ══════════════ */}
      {(missingCars as any[]).filter((c: any) => c.isFound !== "yes").length > 0 && (
        <section className="py-6 max-w-3xl mx-auto px-4 w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-base font-bold text-gray-800">
                {isRTL ? "سيارات مفقودة" : "Missing Cars"}
              </h2>
            </div>
            <Link href="/missing-cars" className="text-xs text-amber-600 font-bold flex items-center gap-0.5 hover:underline">
              {isRTL ? "الكل" : "All"} <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(missingCars as any[]).filter((c: any) => c.isFound !== "yes").slice(0, 4).map((c: any) => (
              <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                {c.image ? (
                  <img src={c.image} alt={c.brand ?? "car"} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-300" />
                  </div>
                )}
                <div className="p-2.5 space-y-1">
                  <h4 className="font-bold text-gray-800 text-xs leading-tight line-clamp-1">
                    {[c.brand, c.model].filter(Boolean).join(" ") || (isRTL ? "مجهولة" : "Unknown")}
                  </h4>
                  {c.city && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{c.city}
                    </p>
                  )}
                  <Button size="sm"
                    className="w-full mt-1 h-7 rounded-lg text-[10px] bg-amber-500 hover:bg-amber-600 text-white gap-1"
                    onClick={() => { setMissingInfoCarId(c.id); setMissingInfoOpen(true); }}>
                    <Send className="w-2.5 h-2.5" />
                    {isRTL ? "إبلاغ" : "Report"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════ VEHICLE REPORT CTA ══════════════ */}
      <section className="py-6 px-4 max-w-3xl mx-auto w-full">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-center shadow-xl shadow-primary/15 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
          <div className="relative z-10">
            <Star className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
            <h2 className="text-lg font-extrabold text-white mb-1">{t("home.ctaReport.title")}</h2>
            <p className="text-white/80 text-xs mb-4 max-w-xs mx-auto">
              {t("home.ctaReport.subtitle")}
            </p>
            <Link href="/vehicle-info">
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-bold px-6 rounded-xl shadow-lg">
                {t("home.ctaReport.btn")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════ MISSING CAR INFO DIALOG ══════════════ */}
      <Dialog open={missingInfoOpen} onOpenChange={setMissingInfoOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("home.missingInfo.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mb-3">
            {isRTL
              ? "إذا رأيت هذه السيارة أو لديك معلومات عنها، أخبر الإدارة."
              : "If you have information about this car, notify the admin."}
          </p>
          <textarea
            value={infoMsg}
            onChange={(e) => setInfoMsg(e.target.value)}
            rows={4}
            placeholder={t("home.missingInfo.placeholder")}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background resize-none focus:border-amber-500 outline-none"
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleSendMissingInfo} disabled={!infoMsg.trim() || sendingInfo}
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold">
              {sendingInfo ? t("home.missingInfo.sending") : t("home.missingInfo.send")}
            </Button>
            <Button variant="outline" onClick={() => setMissingInfoOpen(false)} className="rounded-xl">
              {t("home.missingInfo.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════ BUY REQUEST DETAIL DIALOG ══════════════ */}
      {detailRequest && (
        <Dialog open={!!detailRequest} onOpenChange={(open) => { if (!open) setDetailRequest(null); }}>
          <DialogContent className="max-w-md w-full rounded-2xl p-0 overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader className="px-6 pt-5 pb-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CartIcon className="w-4 h-4 text-primary" />
                {t("home.buyReqs.detailDialog.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-5 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-400 text-xs">{t("home.buyReqs.detailDialog.brand")}</span><br/><span className="font-bold">{detailRequest.brand || t("home.buyReqs.anyBrand")}</span></div>
                  <div><span className="text-gray-400 text-xs">{t("home.buyReqs.detailDialog.model")}</span><br/><span className="font-bold">{detailRequest.model || t("home.buyReqs.anyModel")}</span></div>
                  {(detailRequest.minYear || detailRequest.maxYear) && (
                    <div className="col-span-2 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{detailRequest.minYear ?? "—"} – {detailRequest.maxYear ?? "—"}
                    </div>
                  )}
                  {detailRequest.maxPrice && (
                    <div className="col-span-2">
                      <span className="text-gray-400 text-xs">{t("home.buyReqs.detailDialog.maxPrice")}</span><br/>
                      <span className="font-bold text-primary">{Number(detailRequest.maxPrice).toLocaleString()} {detailRequest.currency ?? "USD"}</span>
                    </div>
                  )}
                  {detailRequest.city && (
                    <div className="col-span-2 flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3 text-gray-400" />{detailRequest.city}
                    </div>
                  )}
                </div>
              </div>
              {detailRequest.description && (
                <p className="text-xs text-gray-500 leading-relaxed">{detailRequest.description}</p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5 h-10 rounded-xl text-sm" disabled={startingChat}
                  onClick={() => { setDetailRequest(null); startChatWithBuyer(detailRequest.userId, detailRequest.id, `مرحباً، رأيت طلب الشراء.`); }}>
                  {startingChat ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  {t("home.buyReqs.detailDialog.contactBuyer")}
                </Button>
                <Button variant="outline" className="h-10 rounded-xl px-4 text-sm" onClick={() => setDetailRequest(null)}>
                  {t("home.buyReqs.detailDialog.close")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

function FeaturedShowrooms({ isRTL }: { isRTL: boolean }) {
  const { data: showrooms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/showrooms/featured"],
    queryFn: () => fetch(withApi("/api/showrooms/featured")).then(r => r.json()),
    staleTime: 60_000,
  });

  const list = Array.isArray(showrooms) ? showrooms : [];
  if (isLoading || list.length === 0) return null;

  return (
    <section className="py-6 bg-gradient-to-br from-primary/5 to-primary/8 w-full">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-base font-bold text-gray-800">
            <Building2 className="inline w-4 h-4 text-primary me-1" />
            {isRTL ? "معارض مميزة" : "Featured Showrooms"}
          </h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {list.map((showroom: any) => (
            <Link key={showroom.id} href={`/showroom/${showroom.id}`} className="group">
              <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center hover:shadow-md hover:border-primary/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gray-50 mx-auto mb-2 overflow-hidden flex items-center justify-center">
                  {showroom.logo ? (
                    <img src={showroom.logo} alt={showroom.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-primary/40" />
                  )}
                </div>
                <p className="font-bold text-xs text-gray-700 line-clamp-1 group-hover:text-primary transition-colors">{showroom.name}</p>
                {showroom.city && (
                  <p className="text-[10px] text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />{showroom.city}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
