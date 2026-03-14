import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, ChevronLeft, ShieldCheck, Zap, Sparkles, PlusCircle, ShoppingCart,
  Car, Key, Bike, Hash, Wrench, Package, Shield, SearchIcon, ShoppingCart as CartIcon,
  AlertTriangle, MapPin, DollarSign, MessageCircle, Eye, Send, FileText, Calendar
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

export default function Home() {
  const { data: featuredCars, isLoading: loadingFeatured } = useGetFeaturedCars();
  const { data: latestCars, isLoading: loadingLatest } = useListCars({ limit: 6, sortBy: 'createdAt:desc' });
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t, isRTL } = useLanguage();

  const [heroSearch, setHeroSearch] = useState("");
  const [missingInfoOpen, setMissingInfoOpen] = useState(false);
  const [missingInfoCarId, setMissingInfoCarId] = useState<number | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [sendingInfo, setSendingInfo] = useState(false);
  const [startingChat, setStartingChat] = useState<number | null>(null);
  const [detailRequest, setDetailRequest] = useState<any | null>(null);

  const startChatWithBuyer = async (targetUserId: number, requestId: number) => {
    if (!user) { navigate("/login"); return; }
    if (user.id === targetUserId) { toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" }); return; }
    setStartingChat(requestId);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = localStorage.getItem("scm_token");
      const res = await fetch(`${BASE}/api/chats/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: targetUserId, carId: null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "Cannot start conversation with yourself") { toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" }); return; }
        throw new Error("failed");
      }
      const conv = await res.json();
      navigate(`/messages?conversationId=${conv.id}`);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setStartingChat(null);
    }
  };

  const isSellerOrDealer = user?.role === "seller" || user?.role === "dealer" || user?.role === "admin";

  const { data: buyRequests = [] } = useQuery({
    queryKey: ["/buy-requests"],
    queryFn: () => api.buyRequests.list(),
    enabled: isSellerOrDealer,
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

  const role = user?.role ?? null;
  const canSell = role === "seller" || role === "dealer";
  const canBuy  = role === "buyer"  || role === "dealer";

  const handleCreateAd = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/add-listing");
  };

  const handleBuyRequest = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/buy-requests");
  };

  const categories = [
    { id: 'new', name: isRTL ? 'سيارات جديدة' : 'New Cars', icon: 'car-new', href: '/search?saleType=new' },
    { id: 'used', name: isRTL ? 'سيارات مستعملة' : 'Used Cars', icon: 'car-used', href: '/search?saleType=used' },
    { id: 'rent', name: isRTL ? 'سيارات للإيجار' : 'Cars for Rent', icon: 'key', href: '/search?saleType=rent' },
    { id: 'motorcycles', name: isRTL ? 'دراجات نارية' : 'Motorcycles', icon: 'bike', href: '/search?category=motorcycle' },
    { id: 'plates', name: isRTL ? 'أرقام اللوحات' : 'License Plates', icon: 'plates', href: '/plates' },
    { id: 'parts', name: t("home.browse.parts"), icon: 'wrench', href: '/car-parts' },
    { id: 'junk', name: t("home.browse.junk"), icon: 'package', href: '/junk-cars' },
    { id: 'inspect', name: t("home.browse.inspections"), icon: 'shield', href: '/inspections' },
    { id: 'missing', name: t("home.browse.missing"), icon: 'search', href: '/missing-cars' },
    { id: 'buy-request', name: t("nav.buyRequests"), icon: 'cart', href: '/buy-requests' },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">

        <motion.img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt="Hero Background"
          className="absolute inset-0 w-full h-full object-cover origin-center"
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 20, ease: "easeInOut", repeat: Infinity }}
        />

        <div className="absolute inset-0 bg-black/45 z-10" />

        <motion.div
          className="absolute z-10 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none"
          style={{ top: "-10%", right: "10%" }}
          animate={{ y: [0, 28, 0], x: [0, -16, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute z-10 w-56 h-56 rounded-full bg-accent/15 blur-3xl pointer-events-none"
          style={{ bottom: "0%", left: "8%" }}
          animate={{ y: [0, -24, 0], x: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, delay: 3 }}
        />
        <motion.div
          className="absolute z-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none"
          style={{ top: "30%", left: "30%" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 7, ease: "easeInOut", repeat: Infinity, delay: 1.5 }}
        />

        <div className="relative z-20 max-w-3xl w-full px-6 text-center space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-xl leading-tight"
          >
            {t("home.hero.title1")} <span className="text-accent">{t("home.hero.title2")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-white/90 drop-shadow-md"
          >
            {t("home.hero.subtitle")}
          </motion.p>

          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={(e) => { e.preventDefault(); navigate(`/search${heroSearch ? `?q=${encodeURIComponent(heroSearch)}` : ""}`); }}
            className="bg-white p-2 rounded-2xl shadow-2xl max-w-2xl mx-auto flex items-center gap-2"
          >
            <div className="flex-1 flex items-center bg-muted/50 rounded-xl px-4 py-3">
              <Search className="w-5 h-5 text-muted-foreground ms-2" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={t("home.hero.search")}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-xl px-8 font-bold text-base h-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
              {t("home.hero.searchBtn")}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-3 pt-2"
          >
            {(canSell || !user) && (
              <button
                onClick={handleCreateAd}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all duration-200"
              >
                <PlusCircle className="w-5 h-5" />
                {t("home.hero.postCar")}
              </button>
            )}

            {(canBuy || !user) && (
              <button
                onClick={handleBuyRequest}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-accent/30 transition-all duration-200"
              >
                <ShoppingCart className="w-5 h-5" />
                {t("home.hero.requestCar")}
              </button>
            )}

            {role === "inspector" && (
              <span className="text-white/70 text-sm bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                {isRTL ? "مرحباً بك يا مفتش 👋" : "Welcome, Inspector 👋"}
              </span>
            )}
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
              'car-new': <Car size={32} />,
              'car-used': <Car size={32} />,
              'key': <Key size={32} />,
              'bike': <Bike size={32} />,
              'plates': <Hash size={32} />,
              'wrench': <Wrench size={32} />,
              'package': <Package size={32} />,
              'shield': <Shield size={32} />,
              'search': <SearchIcon size={32} />,
              'cart': <CartIcon size={32} />,
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
              {featuredCars?.slice(0, 3).map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

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
            {latestCars?.cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* Buy Requests Section — visible to sellers & dealers only */}
      {isSellerOrDealer && (buyRequests as any[]).length > 0 && (
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
                      disabled={startingChat === r.id}
                      onClick={() => startChatWithBuyer(r.userId, r.id)}
                    >
                      {startingChat === r.id
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
                  disabled={startingChat === detailRequest.id}
                  onClick={() => { setDetailRequest(null); startChatWithBuyer(detailRequest.userId, detailRequest.id); }}
                >
                  {startingChat === detailRequest.id
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
