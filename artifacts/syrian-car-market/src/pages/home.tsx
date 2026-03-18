import { useState } from "react";
import { Link, useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import {
  Search, ChevronLeft, ShieldCheck, Zap, Sparkles, PlusCircle, ShoppingCart,
  Car, Key, Bike, Hash, Wrench, Package, Shield, SearchIcon, ShoppingCart as CartIcon,
  AlertTriangle, MapPin, DollarSign, MessageCircle, Eye, Send, FileText, Calendar, Flag,
  Building2, Star
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

  const handleCreateAd = () => {
    navigate("/add-listing");
  };

  const handleBuyRequest = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/buy-requests");
  };

  const categories = [
    { id: 'new', name: isRTL ? 'سيارات جديدة' : 'New Cars', icon: 'car-new', href: '/new-cars' },
    { id: 'used', name: isRTL ? 'سيارات مستعملة' : 'Used Cars', icon: 'car-used', href: '/used-cars' },
    { id: 'rent', name: isRTL ? 'سيارات للإيجار' : 'Cars for Rent', icon: 'key', href: '/rental-cars' },
    { id: 'motorcycles', name: isRTL ? 'دراجات نارية' : 'Motorcycles', icon: 'bike', href: '/motorcycles' },
    { id: 'plates', name: isRTL ? 'أرقام اللوحات' : 'License Plates', icon: 'plates', href: '/plates' },
    { id: 'parts', name: t("home.browse.parts"), icon: 'wrench', href: '/car-parts' },
    { id: 'junk', name: t("home.browse.junk"), icon: 'package', href: '/junk-cars' },
    { id: 'inspect', name: t("home.browse.inspections"), icon: 'shield', href: '/inspections' },
    { id: 'missing', name: t("home.browse.missing"), icon: 'search', href: '/missing-cars' },
    { id: 'buy-request', name: t("nav.buyRequests"), icon: 'cart', href: '/buy-requests' },
    { id: 'auctions', name: isRTL ? '🏁 مزادات' : '🏁 Auctions', icon: 'auctions', href: '/auctions' },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section
        className="relative w-full flex items-center justify-center overflow-hidden text-white text-center"
        style={{
          background: "linear-gradient(135deg, #062f2f 0%, #0f5132 40%, #1c3d2b 100%)",
          padding: "120px 20px",
        }}
      >
        {/* Car outline watermark — animated background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("${import.meta.env.BASE_URL}assets/car-outline.svg")`,
            backgroundSize: "650px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            opacity: 0.05,
            animation: "backgroundMove 30s linear infinite",
          }}
        />

        {/* Animated glow blobs */}
        <motion.div
          className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ top: "-10%", right: "10%", background: "rgba(22,163,74,0.25)" }}
          animate={{ y: [0, 28, 0], x: [0, -16, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{ bottom: "0%", left: "8%", background: "rgba(212,175,55,0.12)" }}
          animate={{ y: [0, -24, 0], x: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, delay: 3 }}
        />

        {/* Hero car image — floating animation */}
        <img
          src={`${import.meta.env.BASE_URL}assets/hero-car.png`}
          alt="MARKLET"
          className="absolute pointer-events-none hidden md:block"
          style={{
            bottom: "-40px",
            right: "5%",
            width: "520px",
            opacity: 0.9,
            animation: "carFloat 6s ease-in-out infinite",
            zIndex: 1,
          }}
        />

        <div className="relative z-10 max-w-3xl w-full space-y-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white/90 text-sm font-semibold px-5 py-2 rounded-full shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            {t("home.hero.badge")}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              fontSize: "clamp(42px, 10vw, 64px)",
              fontWeight: 800,
              color: "#d4af37",
              letterSpacing: "2px",
              lineHeight: 1.15,
              textShadow: "0 2px 20px rgba(212,175,55,0.3)",
            }}
          >
            {t("home.hero.title1")}{t("home.hero.title2") ? <> <span>{t("home.hero.title2")}</span></> : null}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            style={{ fontSize: "clamp(18px, 4vw, 28px)", marginTop: "10px", color: "#fff" }}
            className="font-semibold drop-shadow-md"
          >
            {t("home.hero.subtitle")}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ marginTop: "15px", fontSize: "18px", opacity: 0.9, color: "#fff" }}
            className="max-w-xl mx-auto whitespace-pre-line"
          >
            {t("home.hero.description")}
          </motion.p>

          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams();
              if (heroSearch) params.set("q", heroSearch);
              if (heroProvince) params.set("province", heroProvince);
              navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
            }}
            className="bg-white p-2 rounded-2xl shadow-2xl max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch gap-2"
          >
            <div className="flex-1 flex items-center bg-muted/50 rounded-xl px-4 py-3 min-w-0">
              <Search className="w-5 h-5 text-muted-foreground shrink-0 ms-2" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={isRTL ? "ابحث عن ماركة، موديل..." : "Brand, model..."}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
            <div className="hidden sm:block w-px bg-border/60 self-stretch my-1" />
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 sm:w-44">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={heroProvince}
                onChange={(e) => setHeroProvince(e.target.value)}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-foreground text-sm cursor-pointer"
              >
                <option value="">{isRTL ? "كل المحافظات" : "All Regions"}</option>
                <option value="Damascus">{isRTL ? "دمشق" : "Damascus"}</option>
                <option value="Aleppo">{isRTL ? "حلب" : "Aleppo"}</option>
                <option value="Homs">{isRTL ? "حمص" : "Homs"}</option>
                <option value="Lattakia">{isRTL ? "اللاذقية" : "Lattakia"}</option>
                <option value="Hama">{isRTL ? "حماة" : "Hama"}</option>
                <option value="Deir ez-Zor">{isRTL ? "دير الزور" : "Deir ez-Zor"}</option>
                <option value="Tartus">{isRTL ? "طرطوس" : "Tartus"}</option>
                <option value="Idlib">{isRTL ? "إدلب" : "Idlib"}</option>
              </select>
            </div>
            <Button type="submit" size="lg" className="rounded-xl px-6 font-bold text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all whitespace-nowrap">
              {t("home.hero.searchBtn")}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap justify-center gap-3 pt-2"
          >
            <button
              onClick={handleCreateAd}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all duration-200"
            >
              <PlusCircle className="w-5 h-5" />
              {t("home.hero.postCar")}
            </button>

            <button
              onClick={handleBuyRequest}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-accent/30 transition-all duration-200"
            >
              <ShoppingCart className="w-5 h-5" />
              {t("home.hero.requestCar")}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-secondary/20 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">{t("home.trust.verified")}</p>
              <p className="text-sm text-muted-foreground">{t("home.trust.verifiedSub")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">{t("home.trust.ai")}</p>
              <p className="text-sm text-muted-foreground">{t("home.trust.aiSub")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">{t("home.trust.speed")}</p>
              <p className="text-sm text-muted-foreground">{t("home.trust.speedSub")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("home.browse.title")}</h2>
            <p className="text-muted-foreground mt-1">{isRTL ? "كل ما تحتاجه في عالم السيارات في مكان واحد" : "Everything you need for cars in one place"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat, i) => {
            const iconMap: Record<string, React.ReactNode> = {
              'car-new': <span className="relative inline-flex"><Car size={32} /><span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" title="جديدة" /></span>,
              'car-used': <span className="relative inline-flex opacity-80"><Car size={32} className="text-muted-foreground" /><span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-card" title="مستعملة" /></span>,
              'key': <Key size={32} />,
              'bike': <Bike size={32} />,
              'plates': <Hash size={32} />,
              'wrench': <Wrench size={32} />,
              'package': <Package size={32} />,
              'shield': <Shield size={32} />,
              'search': <SearchIcon size={32} />,
              'cart': <CartIcon size={32} />,
              'auctions': <span className="relative inline-flex"><Flag size={32} className="text-primary" /><span className="absolute -top-1.5 -right-1.5 text-[14px] leading-none">🏁</span></span>,
            };
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                key={cat.id}
              >
                <Link
                  href={cat.href}
                  className="flex flex-col items-center justify-center p-6 bg-card border rounded-2xl hover-elevate group"
                >
                  <span className="mb-3 text-primary group-hover:scale-110 group-hover:text-accent transition-all">
                    {iconMap[cat.icon]}
                  </span>
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors text-center text-sm">{cat.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured Cars */}
      <section className="py-12 bg-secondary/20 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-accent rounded-full inline-block"></span>
                {t("home.featured.title")}
              </h2>
            </div>
            <Link href="/search?featured=true" className="text-primary font-semibold flex items-center gap-1 hover:underline">
              {t("common.all")} <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Array.isArray(featuredCars) ? featuredCars : []).slice(0, 3).map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Showrooms */}
      <FeaturedShowrooms />

      {/* Latest Cars */}
      <section className="py-12 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("home.recentCars.title")}</h2>
            <p className="text-muted-foreground mt-1">{isRTL ? "سيارات أضيفت مؤخراً للسوق" : "Cars recently added to the market"}</p>
          </div>
          <Link href="/search" className="text-primary font-semibold flex items-center gap-1 hover:underline">
            {isRTL ? "تصفح السوق" : "Browse Market"} <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {loadingLatest ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(Array.isArray(latestCars?.cars) ? latestCars!.cars : []).map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* Buy Requests Section — visible to all logged-in users */}
      {(buyRequests as any[]).length > 0 && (
        <section className="py-12 bg-primary/5 w-full">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <span className="w-3 h-8 bg-primary rounded-full inline-block"></span>
                  {t("home.buyReqs.title")}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">{t("home.buyReqs.subtitle")}</p>
              </div>
              <Link href="/buy-requests" className="text-primary font-semibold flex items-center gap-1 hover:underline text-sm">
                {t("home.buyReqs.viewAll")} <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(buyRequests as any[]).slice(0, 6).map((r: any) => (
                <div key={r.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{r.brand || t("home.buyReqs.anyBrand")} {r.model || ""}</h3>
                      {(r.minYear || r.maxYear) && (
                        <p className="text-xs text-muted-foreground">{r.minYear ?? "—"} – {r.maxYear ?? "—"}</p>
                      )}
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">
                      <ShoppingCart className="w-3 h-3 ml-1" /> {t("nav.buyRequests")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {r.maxPrice && (
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <DollarSign className="w-4 h-4" />
                        {isRTL ? "حتى" : "Up to"} {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}
                      </span>
                    )}
                    {r.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />{r.city}
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl gap-1 bg-primary hover:bg-primary/90 text-xs font-bold"
                      disabled={startingChat}
                      onClick={() => startChatWithBuyer(r.userId, r.id, `مرحباً، رأيت طلب الشراء الخاص بك لـ ${[r.brand, r.model].filter(Boolean).join(" ") || "سيارة"}. أنا لدي ما تبحث عنه!`)}
                    >
                      {startingChat
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                        : <MessageCircle className="w-3.5 h-3.5" />
                      }
                      {t("home.buyReqs.contact")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl gap-1 text-xs"
                      onClick={() => setDetailRequest(r)}
                    >
                      <Eye className="w-3.5 h-3.5" /> {t("home.buyReqs.details")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Follow MARKLET Social Section ── */}
      <section className="py-10 max-w-7xl mx-auto px-4 w-full">
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-8 text-center border border-primary/10">
          <h2 className="text-2xl font-bold mb-1">{isRTL ? "تابع MARKLET" : "Follow MARKLET"}</h2>
          <p className="text-muted-foreground text-sm mb-6">{isRTL ? "ابقَ على اطلاع بأحدث الإعلانات والعروض" : "Stay updated with the latest listings and offers"}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {/* Facebook — coming soon */}
            <button
              onClick={() => toast({ title: isRTL ? "قريباً" : "Coming Soon", description: isRTL ? "سيتم إضافة صفحة فيسبوك قريباً" : "Facebook page will be added soon" })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1877F2] text-white font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
            {/* Instagram */}
            <a href="https://www.instagram.com/marklet_official/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-bold text-sm hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>
            {/* WhatsApp Channel */}
            <a href="https://whatsapp.com/channel/0029Vb7vvIf65yD3DNRPrG2Z" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            {/* TikTok */}
            <a href="https://www.tiktok.com/@marklet_official?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#010101] text-white font-bold text-sm hover:opacity-80 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>
              TikTok
            </a>
          </div>
        </div>
      </section>

      {/* Missing Cars Section */}
      {(missingCars as any[]).filter((c: any) => c.isFound !== "yes").length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 w-full">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-amber-500 rounded-full inline-block"></span>
                {isRTL ? "سيارات مفقودة" : "Missing Cars"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">{isRTL ? "إذا رأيت إحدى هذه السيارات، أبلغ الإدارة" : "If you see any of these cars, notify the admin"}</p>
            </div>
            <Link href="/missing-cars" className="text-amber-600 font-semibold flex items-center gap-1 hover:underline text-sm">
              {isRTL ? "عرض الكل" : "View All"} <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(missingCars as any[]).filter((c: any) => c.isFound !== "yes").slice(0, 4).map((c: any) => (
              <div key={c.id} className="bg-card border-2 border-amber-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {c.image ? (
                  <img src={c.image} alt={c.brand ?? (isRTL ? "سيارة" : "Car")} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-12 h-12 text-amber-300" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground text-sm">{[c.brand, c.model].filter(Boolean).join(" ") || (isRTL ? "سيارة مجهولة" : "Unknown Car")}</h4>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{isRTL ? "مفقودة" : "Missing"}</Badge>
                  </div>
                  {c.color && <p className="text-xs text-muted-foreground">{isRTL ? `اللون: ${c.color}` : `Color: ${c.color}`}</p>}
                  {c.plateNumber && <p className="text-xs font-bold text-foreground">{isRTL ? `لوحة: ${c.plateNumber}` : `Plate: ${c.plateNumber}`}</p>}
                  {c.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</p>}
                  <Button
                    size="sm"
                    className="w-full mt-2 rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                    onClick={() => { setMissingInfoCarId(c.id); setMissingInfoOpen(true); }}
                  >
                    <Send className="w-3 h-3" /> {isRTL ? "إرسال معلومات إلى الإدارة" : "Send Info to Admin"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Send Missing Car Info Dialog */}
      <Dialog open={missingInfoOpen} onOpenChange={setMissingInfoOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t("home.missingInfo.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            {isRTL
              ? "إذا رأيت هذه السيارة أو لديك معلومات عنها، أخبر الإدارة وسيتم التواصل معك."
              : "If you've seen this car or have information about it, tell the admin and they will contact you."}
          </p>
          <textarea
            value={infoMsg}
            onChange={(e) => setInfoMsg(e.target.value)}
            rows={4}
            placeholder={t("home.missingInfo.placeholder")}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background resize-none focus:border-amber-500 outline-none"
          />
          <div className="flex gap-3 mt-2">
            <Button
              onClick={handleSendMissingInfo}
              disabled={!infoMsg.trim() || sendingInfo}
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              {sendingInfo ? t("home.missingInfo.sending") : t("home.missingInfo.send")}
            </Button>
            <Button variant="outline" onClick={() => setMissingInfoOpen(false)} className="rounded-xl">
              {t("home.missingInfo.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Report CTA */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center shadow-2xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">{t("home.ctaReport.title")}</h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              {t("home.ctaReport.subtitle")}
            </p>
            <Link href="/vehicle-info">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold text-lg px-8 rounded-xl shadow-xl hover:-translate-y-1 transition-transform">
                {t("home.ctaReport.btn")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Buy Request Details Dialog */}
      {detailRequest && (
        <Dialog open={!!detailRequest} onOpenChange={(open) => { if (!open) setDetailRequest(null); }}>
          <DialogContent className="max-w-md w-full rounded-2xl p-0 overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CartIcon className="w-5 h-5 text-primary" />
                {t("home.buyReqs.detailDialog.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-base flex items-center gap-2 mb-3"><Car className="w-4 h-4" /> {t("home.buyReqs.detailDialog.vehicle")}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{t("home.buyReqs.detailDialog.brand")} </span><span className="font-medium">{detailRequest.brand || t("home.buyReqs.anyBrand")}</span></div>
                  <div><span className="text-muted-foreground">{t("home.buyReqs.detailDialog.model")} </span><span className="font-medium">{detailRequest.model || t("home.buyReqs.anyModel")}</span></div>
                  {(detailRequest.minYear || detailRequest.maxYear) && (
                    <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{detailRequest.minYear ?? "—"} – {detailRequest.maxYear ?? "—"}</span>
                    </div>
                  )}
                  {detailRequest.maxPrice && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t("home.buyReqs.detailDialog.maxPrice")} </span>
                      <span className="font-bold text-primary">{Number(detailRequest.maxPrice).toLocaleString()} {detailRequest.currency ?? "USD"}</span>
                    </div>
                  )}
                  {detailRequest.city && (
                    <div className="col-span-2 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{detailRequest.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {detailRequest.description && (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-muted-foreground flex items-center gap-1"><FileText className="w-4 h-4" /> {t("home.buyReqs.detailDialog.notes")}</p>
                  <p className="text-sm leading-relaxed bg-muted/20 rounded-xl p-3 whitespace-pre-wrap">{detailRequest.description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 gap-1.5 h-11 rounded-xl"
                  disabled={startingChat}
                  onClick={() => { setDetailRequest(null); startChatWithBuyer(detailRequest.userId, detailRequest.id, `مرحباً، رأيت طلب الشراء الخاص بك لـ ${[detailRequest.brand, detailRequest.model].filter(Boolean).join(" ") || "سيارة"}. أنا لدي ما تبحث عنه!`); }}
                >
                  {startingChat
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    : <MessageCircle className="w-4 h-4" />
                  }
                  {t("home.buyReqs.detailDialog.contactBuyer")}
                </Button>
                <Button variant="outline" className="h-11 rounded-xl px-4" onClick={() => setDetailRequest(null)}>
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

function FeaturedShowrooms() {
  const { data: showrooms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/showrooms/featured"],
    queryFn: () => fetch(withApi("/api/showrooms/featured")).then(r => r.json()),
    staleTime: 60_000,
  });

  const list = Array.isArray(showrooms) ? showrooms : [];
  if (isLoading || list.length === 0) return null;

  return (
    <section className="py-12 w-full bg-gradient-to-br from-primary/5 to-primary/10" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="w-3 h-8 bg-primary rounded-full inline-block"></span>
              <Building2 className="w-6 h-6 text-primary" />
              معارض سيارات مميزة
            </h2>
            <p className="text-muted-foreground mt-1">معارض موثقة ومميزة على المنصة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {list.map((showroom: any) => (
            <Link key={showroom.id} href={`/showroom/${showroom.id}`} className="group">
              <div className="bg-card border rounded-2xl p-4 text-center hover:shadow-md hover:border-primary/30 transition-all">
                <div className="w-16 h-16 rounded-xl border bg-muted mx-auto mb-3 overflow-hidden flex items-center justify-center">
                  {showroom.logo ? (
                    <img src={showroom.logo} alt={showroom.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-primary/40" />
                  )}
                </div>
                <p className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{showroom.name}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{showroom.city}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
