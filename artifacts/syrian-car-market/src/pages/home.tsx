// UI_ID: HOME_01
// NAME: الصفحة الرئيسية
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useScrollFix } from "@/hooks/useScrollFix";
import { withApi, imgUrl } from "@/lib/runtimeConfig";
import { getRealEstate, getJobs } from "@/lib/api";
import {
  Search,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Sparkles,
  PlusCircle,
  ShoppingCart,
  Car,
  Key,
  Bike,
  Hash,
  Wrench,
  Package,
  Shield,
  SearchIcon,
  ShoppingCart as CartIcon,
  AlertTriangle,
  MapPin,
  DollarSign,
  MessageCircle,
  Eye,
  Send,
  FileText,
  Calendar,
  Flag,
  Building2,
  Star,
  Share2,
  FileSearch2,
  Briefcase,
  House,
  BedDouble,
  Banknote,
  LandPlot,
  Store,
  Warehouse,
  UserCheck,
  HardHat,
  ShoppingBag,
  Truck,
  Tag,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { VehicleReportWidget } from "@/components/VehicleReportWidget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CarCard } from "@/components/CarCard";
import { ListingCard } from "@/components/ListingCard";
import { normalizeAd } from "@/utils/normalizeAd";
import { useGetFeaturedCars, useListCars } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { useStartChat } from "@/hooks/use-start-chat";
import { VideoCarousel } from "@/components/VideoCarousel";
import {
  HeroCategorySlider,
  SLIDES,
  SLIDE_DURATION,
} from "@/components/HeroCategorySlider";

// ── خدمات التطبيق — تتناوب في الزر الحيوي بالـ Hero ──────────────────────────
const SERVICE_TIPS: Array<{ icon: ReactNode; text: string }> = [
  {
    icon: <Car size={13} />,
    text: "بيع سيارتك بسرعة وأمان — آلاف المشترين ينتظرون عرضك الآن",
  },
  {
    icon: <Building2 size={13} />,
    text: "أعلن عن عقارك للبيع أو الإيجار وتواصل مع المهتمين مباشرةً",
  },
  {
    icon: <Briefcase size={13} />,
    text: "انشر وظيفتك الشاغرة أو ابحث عن فرصة عمل مناسبة لمهاراتك",
  },
  {
    icon: <ShoppingCart size={13} />,
    text: "انشر طلب شراء مجاناً وستصلك العروض مباشرةً من البائعين",
  },
  {
    icon: <Key size={13} />,
    text: "استأجر سيارة ليوم أو شهر أو أكثر بأفضل الأسعار في سوريا",
  },
  {
    icon: <House size={13} />,
    text: "ابحث عن شقة أو منزل أو أرض في جميع المحافظات السورية",
  },
  {
    icon: <Wrench size={13} />,
    text: "قطع غيار أصلية وبديلة بأسعار تنافسية من بائعين موثوقين",
  },
  {
    icon: <FileSearch2 size={13} />,
    text: "استعلم عن حالة أي مركبة قبل شراءها عبر رقم الشاسيه VIN",
  },
  {
    icon: <Package size={13} />,
    text: "تخلص من سيارتك المعطوبة أو المصدومة واحصل على أفضل سعر",
  },
  {
    icon: <ShieldCheck size={13} />,
    text: "احجز فحص مركبة من مراكز معتمدة قبل إتمام أي صفقة شراء",
  },
  {
    icon: <AlertTriangle size={13} />,
    text: "ساعد في استعادة السيارات المسروقة أو المفقودة وأبلغ فوراً",
  },
];

export default function Home() {
  useScrollFix();

  const { data: featuredCars, isLoading: loadingFeatured } =
    useGetFeaturedCars();
  const { data: latestCars, isLoading: loadingLatest } = useListCars({
    limit: 6,
    sortBy: "createdAt:desc",
  });

  const { data: latestRealEstate = [] } = useQuery({
    queryKey: ["/real-estate", "home"],
    queryFn: () => getRealEstate({ limit: "6" }),
    staleTime: 60_000,
  });

  const { data: latestJobs = [] } = useQuery({
    queryKey: ["/jobs", "home"],
    queryFn: () => getJobs({ limit: "6" }),
    staleTime: 60_000,
  });
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t, isRTL } = useLanguage();

  const heroSearchRef = useRef<HTMLInputElement>(null);
  const [heroSearch, setHeroSearch] = useState("");
  const [heroProvince, setHeroProvince] = useState("");
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [heroSlideVisible, setHeroSlideVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % SERVICE_TIPS.length);
        setTipVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlideVisible(false);
      setTimeout(() => {
        setHeroSlideIdx((i) => (i + 1) % SLIDES.length);
        setHeroSlideVisible(true);
      }, 350);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const [missingInfoOpen, setMissingInfoOpen] = useState(false);
  const [missingInfoCarId, setMissingInfoCarId] = useState<number | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [sendingInfo, setSendingInfo] = useState(false);
  const { startChat, loading: startingChat } = useStartChat();
  const [detailRequest, setDetailRequest] = useState<any | null>(null);

  const startChatWithBuyer = (
    targetUserId: number,
    _requestId: number,
    initialMsg?: string,
  ) => startChat(targetUserId, initialMsg);

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
      toast({
        title: t("home.missingInfo.success"),
        description: t("home.missingInfo.successDesc"),
      });
      setMissingInfoOpen(false);
      setInfoMsg("");
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSendingInfo(false);
    }
  };

  const handleCreateAd = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/add-listing");
  };

  const handleBuyRequest = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/buy-requests");
  };

  const categories = [
    {
      id: "real-estate",
      name: isRTL ? "عقارات" : "Real Estate",
      icon: "realestate",
      href: "/real-estate",
    },
    { id: "jobs", name: isRTL ? "وظائف" : "Jobs", icon: "jobs", href: "/jobs" },
    {
      id: "new",
      name: isRTL ? "سيارات جديدة" : "New Cars",
      icon: "car-new",
      href: "/new-cars",
    },
    {
      id: "used",
      name: isRTL ? "سيارات مستعملة" : "Used Cars",
      icon: "car-used",
      href: "/used-cars",
    },
    {
      id: "rent",
      name: isRTL ? "سيارات للإيجار" : "Cars for Rent",
      icon: "key",
      href: "/rental-cars",
    },
    {
      id: "motorcycles",
      name: isRTL ? "دراجات نارية" : "Motorcycles",
      icon: "bike",
      href: "/motorcycles",
    },
    {
      id: "plates",
      name: isRTL ? "أرقام اللوحات" : "License Plates",
      icon: "plates",
      href: "/plates",
    },
    {
      id: "parts",
      name: t("home.browse.parts"),
      icon: "wrench",
      href: "/car-parts",
    },
    {
      id: "junk",
      name: t("home.browse.junk"),
      icon: "package",
      href: "/junk-cars",
    },
    {
      id: "inspect",
      name: t("home.browse.inspections"),
      icon: "shield",
      href: "/inspections",
    },
    {
      id: "showrooms",
      name: isRTL ? "معارض" : "Showrooms",
      icon: "showrooms",
      href: "/showrooms",
    },
    {
      id: "missing",
      name: t("home.browse.missing"),
      icon: "search",
      href: "/missing-cars",
    },
    {
      id: "buy-request",
      name: t("nav.buyRequests"),
      icon: "cart",
      href: "/buy-requests",
    },
    {
      id: "auctions",
      name: isRTL ? "مزادات" : "Auctions",
      icon: "auctions",
      href: "/auctions",
    },
  ];

  return (
    <div className="home-page flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section
        className="hero-section relative w-full flex items-center justify-center overflow-hidden text-white text-center py-5 sm:py-16 md:py-28"
        style={{
          background:
            "linear-gradient(135deg, #062f2f 0%, #0f5132 40%, #1c3d2b 100%)",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        {/* ── منزلق الفئات — يتبادل بين السيارات / العقارات / الوظائف / الخ ── */}
        <HeroCategorySlider baseUrl={import.meta.env.BASE_URL} />

        {/* Animated glow blobs */}
        <motion.div
          className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{
            top: "-10%",
            right: "10%",
            background: "rgba(22,163,74,0.25)",
          }}
          animate={{ y: [0, 28, 0], x: [0, -16, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{
            bottom: "0%",
            left: "8%",
            background: "rgba(212,175,55,0.12)",
          }}
          animate={{ y: [0, -24, 0], x: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{
            duration: 12,
            ease: "easeInOut",
            repeat: Infinity,
            delay: 3,
          }}
        />

        <div className="relative z-10 max-w-3xl w-full space-y-3 sm:space-y-5">
          {/* ── شريط الخدمات الحيوي ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white/90 text-sm font-medium px-4 py-2 rounded-full shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                opacity: tipVisible ? 1 : 0,
                transform: tipVisible ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              <span className="shrink-0 opacity-90">
                {SERVICE_TIPS[tipIdx].icon}
              </span>
              {SERVICE_TIPS[tipIdx].text}
            </span>
          </motion.div>

          {/* ── أيقونة الفئة المتغيرة — Mobile فقط، بين النصيحة والعنوان ── */}
          {(() => {
            const s = SLIDES[heroSlideIdx];
            const { Icon } = s;
            return (
              <div
                className="md:hidden flex items-center justify-center gap-3 py-1"
                style={{
                  opacity: heroSlideVisible ? 1 : 0,
                  transform: heroSlideVisible ? "scale(1)" : "scale(0.88)",
                  transition: "opacity 0.35s ease, transform 0.35s ease",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: `1.5px solid ${s.accentColor}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 28px ${s.bgColor}`,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={38} color={s.accentColor} strokeWidth={1.4} />
                </div>
                <span
                  style={{
                    color: s.accentColor,
                    fontWeight: 800,
                    fontSize: 20,
                    letterSpacing: 1,
                    direction: "rtl",
                    textShadow: `0 2px 10px ${s.bgColor}`,
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })()}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="hero-title"
            style={{
              fontWeight: 800,
              color: "#d4af37",
              letterSpacing: "2px",
              lineHeight: 1.15,
              textShadow: "0 2px 20px rgba(212,175,55,0.3)",
            }}
          >
            {t("home.hero.title1")}
            {t("home.hero.title2") ? (
              <>
                {" "}
                <span>{t("home.hero.title2")}</span>
              </>
            ) : null}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="hero-subtitle font-semibold drop-shadow-md"
            style={{ color: "#fff" }}
          >
            {t("home.hero.subtitle")}
          </motion.p>

          {/* Description — small on mobile, larger on desktop */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto whitespace-pre-line text-xs sm:text-lg"
            style={{ opacity: 0.85, color: "#fff" }}
          >
            {t("home.hero.description")}
          </motion.p>

          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onSubmit={(e) => {
              e.preventDefault();
              const q = heroSearchRef.current?.value.trim() ?? "";
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (heroProvince) params.set("province", heroProvince);
              navigate(
                `/search${params.toString() ? `?${params.toString()}` : ""}`,
              );
            }}
            className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-2xl max-w-2xl mx-auto flex flex-col gap-1.5 sm:gap-2 sm:flex-row sm:items-stretch"
          >
            {/* Row 1 on mobile: search + province side by side | on sm+: inline with button */}
            <div className="flex items-stretch gap-1.5 sm:contents">
              <div className="flex-1 flex items-center bg-muted/50 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-0">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0 ms-1 sm:ms-2" />
                <input
                  ref={heroSearchRef}
                  type="text"
                  defaultValue={heroSearch}
                  onInput={(e) =>
                    setHeroSearch((e.target as HTMLInputElement).value)
                  }
                  placeholder={
                    isRTL ? "ابحث عن ماركة، موديل..." : "Brand, model..."
                  }
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
                />
              </div>
              <div className="hidden sm:block w-px bg-border/60 self-stretch my-1" />
              <div className="flex items-center gap-1 sm:gap-2 bg-muted/50 rounded-xl px-2 sm:px-4 py-2 sm:py-3 w-28 sm:w-44">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                <select
                  value={heroProvince}
                  onChange={(e) => setHeroProvince(e.target.value)}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-foreground text-xs sm:text-sm cursor-pointer"
                >
                  <option value="">
                    {isRTL ? "كل المحافظات" : "All Regions"}
                  </option>
                  {[
                    "دمشق",
                    "ريف دمشق",
                    "حلب",
                    "حمص",
                    "حماة",
                    "اللاذقية",
                    "طرطوس",
                    "إدلب",
                    "دير الزور",
                    "الرقة",
                    "الحسكة",
                    "درعا",
                    "السويداء",
                    "القنيطرة",
                  ].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Row 2 on mobile: full-width button */}
            <Button
              type="submit"
              className="w-full sm:w-auto rounded-xl px-4 sm:px-6 font-bold text-sm sm:text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all whitespace-nowrap py-2.5 sm:py-3"
            >
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

      {/* ══════════════════════════════════════════════════════════════
          Marketplace "كل شيء" Section
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-10 w-full border-b border-orange-100 dark:border-orange-900/30 overflow-hidden relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-l from-orange-50/80 to-amber-50/60 dark:from-orange-950/20 dark:to-amber-950/10 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-600 opacity-70" />

        <div className="max-w-7xl mx-auto px-4 relative">
          {/* Header */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <span className="w-3 h-8 bg-orange-500 rounded-full inline-block"></span>
                  كل شيء
                </h2>
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">🔥 جديد</span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                سوق المستعملات — بيع واشترِ الأثاث، الملابس، الإلكترونيات وأكثر
              </p>
            </div>
            <Link href="/marketplace" className="text-orange-600 font-semibold flex items-center gap-1 hover:underline text-sm shrink-0">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
            {[
              { label: "أثاث", icon: "🛋️" },
              { label: "ملابس", icon: "👗" },
              { label: "إلكترونيات", icon: "📱" },
              { label: "أدوات", icon: "🔧" },
              { label: "كتب", icon: "📚" },
              { label: "أطفال", icon: "🧸" },
              { label: "رياضة", icon: "⚽" },
              { label: "أجهزة منزلية", icon: "🏠" },
            ].map(cat => (
              <Link key={cat.label} href={`/marketplace?category=${encodeURIComponent(cat.label === "أثاث" ? "أثاث ومنزل" : cat.label === "ملابس" ? "ملابس وأحذية" : cat.label === "أدوات" ? "أدوات ومعدات" : cat.label === "كتب" ? "كتب وتعليم" : cat.label === "أطفال" ? "مستلزمات أطفال" : cat.label === "رياضة" ? "رياضة وترفيه" : cat.label === "أجهزة منزلية" ? "أجهزة منزلية" : cat.label)}`}>
                <div className="flex flex-col items-center justify-center p-2 bg-card border border-orange-100 dark:border-orange-900/30 rounded-xl cursor-pointer hover:border-orange-400 hover:shadow-sm transition-all group text-center gap-1">
                  <span className="text-2xl group-hover:scale-125 transition-transform">{cat.icon}</span>
                  <span className="font-semibold text-foreground leading-tight text-[10px]">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA Banner */}
          <Link href="/marketplace">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-orange-500 to-amber-600 px-4 py-2.5 text-white cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all active:scale-[0.99] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <ShoppingBag className="w-4 h-4 opacity-90" />
                <span className="text-sm font-extrabold whitespace-nowrap">سوق المستعملات — كل شيء</span>
              </div>
              <span className="text-orange-100 text-xs whitespace-nowrap">🚚 شحن سريع &nbsp;|&nbsp; 💳 دفع إلكتروني &nbsp;|&nbsp; 🏷 أسعار بالليرة</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-3 sm:py-8 bg-secondary/20 border-b border-border/50">
        <div className="features-bar max-w-7xl mx-auto px-4 flex flex-nowrap sm:flex-wrap justify-around sm:justify-center gap-2 sm:gap-16">
          {/* موثوقية — mobile: icon+text inline compact | desktop: full card */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground text-xs sm:text-base leading-tight">
                {t("home.trust.verified")}
              </p>
              <p className="text-muted-foreground hidden sm:block text-sm">
                {t("home.trust.verifiedSub")}
              </p>
            </div>
          </div>

          {/* فاصل موبايل */}
          <div className="w-px bg-border/60 self-stretch sm:hidden" />

          {/* ذكاء اصطناعي */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground text-xs sm:text-base leading-tight">
                {t("home.trust.ai")}
              </p>
              <p className="text-muted-foreground hidden sm:block text-sm">
                {t("home.trust.aiSub")}
              </p>
            </div>
          </div>

          {/* فاصل موبايل */}
          <div className="w-px bg-border/60 self-stretch sm:hidden" />

          {/* سرعة التواصل */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Zap className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground text-xs sm:text-base leading-tight">
                {t("home.trust.speed")}
              </p>
              <p className="text-muted-foreground hidden sm:block text-sm">
                {t("home.trust.speedSub")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 sm:py-12 max-w-7xl mx-auto px-3 sm:px-4 w-full">
        <div className="flex justify-between items-end mb-4 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {t("home.browse.title")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base hidden sm:block">
              {isRTL
                ? "سيارات، عقارات، وظائف، وأكثر — كل شيء في مكان واحد"
                : "Cars, real estate, jobs and more — all in one place"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 sm:gap-4">
          {categories.map((cat, i) => {
            const catMeta: Record<
              string,
              { icon: React.ReactNode; color: string; bg: string }
            > = {
              "car-new": {
                icon: <Car size={22} />,
                color: "text-green-600",
                bg: "bg-green-100",
              },
              "car-used": {
                icon: <Car size={22} />,
                color: "text-amber-600",
                bg: "bg-amber-100",
              },
              key: {
                icon: <Key size={22} />,
                color: "text-blue-600",
                bg: "bg-blue-100",
              },
              bike: {
                icon: <Bike size={22} />,
                color: "text-purple-600",
                bg: "bg-purple-100",
              },
              plates: {
                icon: <Hash size={22} />,
                color: "text-indigo-600",
                bg: "bg-indigo-100",
              },
              wrench: {
                icon: <Wrench size={22} />,
                color: "text-orange-600",
                bg: "bg-orange-100",
              },
              package: {
                icon: <Package size={22} />,
                color: "text-red-600",
                bg: "bg-red-100",
              },
              shield: {
                icon: <Shield size={22} />,
                color: "text-teal-600",
                bg: "bg-teal-100",
              },
              search: {
                icon: <SearchIcon size={22} />,
                color: "text-pink-600",
                bg: "bg-pink-100",
              },
              cart: {
                icon: <CartIcon size={22} />,
                color: "text-primary",
                bg: "bg-primary/10",
              },
              auctions: {
                icon: <Flag size={22} />,
                color: "text-yellow-600",
                bg: "bg-yellow-100",
              },
              showrooms: {
                icon: <Building2 size={22} />,
                color: "text-emerald-600",
                bg: "bg-emerald-100",
              },
              realestate: {
                icon: <House size={22} />,
                color: "text-cyan-600",
                bg: "bg-cyan-100",
              },
              jobs: {
                icon: <Briefcase size={22} />,
                color: "text-violet-600",
                bg: "bg-violet-100",
              },
            };
            const meta = catMeta[cat.icon] ?? {
              icon: <Car size={22} />,
              color: "text-primary",
              bg: "bg-primary/10",
            };
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={cat.id}
              >
                <Link
                  href={cat.href}
                  className="tap-card flex flex-col items-center justify-center p-2 sm:p-5 bg-card border rounded-xl sm:rounded-2xl select-none touch-manipulation group"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <span
                    className={`mb-1 sm:mb-3 w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${meta.bg} ${meta.color} group-hover:scale-110 transition-transform`}
                  >
                    {meta.icon}
                  </span>
                  <span
                    className="font-semibold text-foreground text-center leading-tight"
                    style={{ fontSize: "10px" }}
                  >
                    {cat.name.replace(/^🏁\s?/, "")}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Video Carousel */}
      <VideoCarousel />

      {/* ── الإعلانات المميزة — جميع الفئات ── */}
      <section className="py-12 bg-secondary/20 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-accent rounded-full inline-block"></span>
                {t("home.featured.title")}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                سيارات • عقارات • وظائف وأكثر
              </p>
            </div>
          </div>

          {loadingFeatured ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            (() => {
              const cars2 = (
                Array.isArray(featuredCars) ? featuredCars : []
              ).slice(0, 2);
              const reals2 = (latestRealEstate as any[]).slice(0, 2);
              const jobs2 = (latestJobs as any[]).slice(0, 2);
              const mixed = [
                ...cars2.map((c) => ({
                  _type: "car" as const,
                  _id: `car-${c.id}`,
                  data: c,
                })),
                ...reals2.map((r) => ({
                  _type: "re" as const,
                  _id: `re-${r.id}`,
                  data: r,
                })),
                ...jobs2.map((j) => ({
                  _type: "job" as const,
                  _id: `job-${j.id}`,
                  data: j,
                })),
              ];
              if (mixed.length === 0) return null;
              return (
                <>
                  <div className="ads-grid ...">
                    {mixed.map((item) => {
                      if (item._type === "car") {
                        return <CarCard key={item._id} car={item.data} />;
                      }

                      if (item._type === "re") {
                        const r = item.data;
                        return (
                          <ListingCard
                            key={item._id}
                            ad={normalizeAd(r, "real_estate")}
                            onCardClick={() => navigate(`/real-estate/${r.id}`)}
                            onChat={r.sellerId ? () => startChat(r.sellerId) : undefined}
                            currentUserId={user?.id}
                          />
                        );
                      }

                      if (item._type === "job") {
                        const j = item.data;
                        return (
                          <ListingCard
                            key={item._id}
                            ad={normalizeAd(j, "job")}
                            onCardClick={() => navigate(`/jobs/${j.id}`)}
                            onChat={j.posterId ? () => startChat(j.posterId) : undefined}
                            currentUserId={user?.id}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>
                  <div className="mt-6 text-center">
                    <Link href="/search?featured=true">
                      <button className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all duration-200 text-sm">
                        {t("common.all")}
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </>
              );
            })()
          )}
        </div>
      </section>

      {/* Featured Showrooms */}
      <FeaturedShowrooms />

      {/* ── أحدث الإعلانات — جميع الفئات ── */}
      <section className="py-12 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isRTL ? "أحدث الإعلانات" : "Latest Listings"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isRTL
                ? "سيارات، عقارات، وظائف — أضيفت للتو"
                : "Cars, real estate, jobs — just added"}
            </p>
          </div>
        </div>

        {loadingLatest ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          (() => {
            const latestCarsList = (
              Array.isArray(latestCars?.cars) ? latestCars!.cars : []
            ).slice(0, 2);
            const latestREList = (latestRealEstate as any[]).slice(2, 4);
            const latestJobsList = (latestJobs as any[]).slice(2, 4);
            const mixed = [
              ...latestCarsList.map((c: any) => ({
                _type: "car" as const,
                _id: `lcar-${c.id}`,
                data: c,
              })),
              ...latestREList.map((r) => ({
                _type: "re" as const,
                _id: `lre-${r.id}`,
                data: r,
              })),
              ...latestJobsList.map((j) => ({
                _type: "job" as const,
                _id: `ljob-${j.id}`,
                data: j,
              })),
            ];
            if (mixed.length === 0) return null;
            return (
              <>
                <div className="ads-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {mixed.map((item) => {
                    if (item._type === "car") {
                      return <CarCard key={item._id} car={item.data} />;
                    }

                    if (item._type === "re") {
                      const r = item.data;
                      return (
                        <ListingCard
                          key={item._id}
                          ad={normalizeAd(r, "real_estate")}
                          onCardClick={() => navigate(`/real-estate/${r.id}`)}
                          onChat={r.sellerId ? () => startChat(r.sellerId) : undefined}
                          currentUserId={user?.id}
                        />
                      );
                    }

                    if (item._type === "job") {
                      const j = item.data;
                      return (
                        <ListingCard
                          key={item._id}
                          ad={normalizeAd(j, "job")}
                          onCardClick={() => navigate(`/jobs/${j.id}`)}
                          onChat={j.posterId ? () => startChat(j.posterId) : undefined}
                          currentUserId={user?.id}
                        />
                      );
                    }

                    return null;
                  })}
                </div>

                <div className="mt-6 text-center">
                  <Link href="/search">
                    <button className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all duration-200 text-sm">
                      {isRTL ? "تصفح السوق كاملاً" : "Browse All Market"}
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </>
            );
          })()
        )}
      </section>

      {/* Real Estate Section */}
      <section className="py-10 bg-cyan-50/40 dark:bg-cyan-950/10 w-full border-y border-cyan-100 dark:border-cyan-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-cyan-500 rounded-full inline-block"></span>
                {isRTL ? "العقارات" : "Real Estate"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isRTL
                  ? "شقق، منازل، وأراضي للبيع والإيجار"
                  : "Apartments, homes and land for sale or rent"}
              </p>
            </div>
            <Link
              href="/real-estate"
              className="text-cyan-600 font-semibold flex items-center gap-1 hover:underline text-sm"
            >
              {isRTL ? "عرض الكل" : "View All"}{" "}
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* Real Estate Category Icons */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
            {[
              {
                label: "شقق",
                icon: <BedDouble size={20} />,
                color: "text-cyan-600",
                bg: "bg-cyan-100",
                sub: "شقق",
              },
              {
                label: "مكاتب",
                icon: <Building2 size={20} />,
                color: "text-blue-600",
                bg: "bg-blue-100",
                sub: "مكاتب",
              },
              {
                label: "محلات",
                icon: <Store size={20} />,
                color: "text-indigo-600",
                bg: "bg-indigo-100",
                sub: "محلات تجارية",
              },
              {
                label: "أراضي",
                icon: <LandPlot size={20} />,
                color: "text-green-600",
                bg: "bg-green-100",
                sub: "أراضي",
              },
              {
                label: "مستودعات",
                icon: <Warehouse size={20} />,
                color: "text-orange-600",
                bg: "bg-orange-100",
                sub: "مستودعات",
              },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={`/real-estate?subCategory=${encodeURIComponent(cat.sub)}`}
              >
                <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-card border rounded-xl cursor-pointer hover:border-cyan-400 hover:shadow-sm transition-all group text-center">
                  <span
                    className={`mb-1.5 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}
                  >
                    {cat.icon}
                  </span>
                  <span
                    className="font-semibold text-foreground leading-tight"
                    style={{ fontSize: "10px" }}
                  >
                    {cat.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {(latestRealEstate as any[]).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(latestRealEstate as any[]).slice(0, 4).map((item: any) => (
                <ListingCard
                  key={item.id}
                  ad={normalizeAd(item, "real_estate")}
                  onCardClick={() => navigate(`/real-estate/${item.id}`)}
                  onChat={
                    item.sellerId ? () => startChat(item.sellerId) : undefined
                  }
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}

          <div className="mt-5 text-center">
            <Link href="/real-estate">
              <button className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-cyan-500 text-cyan-600 font-bold hover:bg-cyan-500 hover:text-white transition-all duration-200 text-sm">
                {isRTL ? "تصفح كل العقارات" : "Browse All Real Estate"}
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Jobs & Labor Section */}
      <section className="py-10 bg-violet-50/40 dark:bg-violet-950/10 w-full border-b border-violet-100 dark:border-violet-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-violet-500 rounded-full inline-block"></span>
                {isRTL ? "الوظائف والعمالة" : "Jobs & Labor"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isRTL
                  ? "فرص عمل، عمالة منزلية، وعمال مهرة في سورية"
                  : "Job opportunities, domestic labor, and skilled workers in Syria"}
              </p>
            </div>
            <Link
              href="/jobs"
              className="text-violet-600 font-semibold flex items-center gap-1 hover:underline text-sm"
            >
              {isRTL ? "عرض الكل" : "View All"}{" "}
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* Jobs Category Icons */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
            {[
              {
                label: "وظائف شاغرة",
                icon: <Briefcase size={20} />,
                color: "text-violet-600",
                bg: "bg-violet-100",
                sub: "وظيفة شاغرة",
              },
              {
                label: "طلب توظيف",
                icon: <UserCheck size={20} />,
                color: "text-blue-600",
                bg: "bg-blue-100",
                sub: "طلب توظيف",
              },
              {
                label: "عمالة منزلية",
                icon: <House size={20} />,
                color: "text-pink-600",
                bg: "bg-pink-100",
                sub: "عمالة منزلية",
              },
              {
                label: "عمال مهرة",
                icon: <HardHat size={20} />,
                color: "text-amber-600",
                bg: "bg-amber-100",
                sub: "عمال مهرة",
              },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={`/jobs?subCategory=${encodeURIComponent(cat.sub)}`}
              >
                <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-card border rounded-xl cursor-pointer hover:border-violet-400 hover:shadow-sm transition-all group text-center">
                  <span
                    className={`mb-1.5 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}
                  >
                    {cat.icon}
                  </span>
                  <span
                    className="font-semibold text-foreground leading-tight"
                    style={{ fontSize: "10px" }}
                  >
                    {cat.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

        {(latestJobs as any[]).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(latestJobs as any[]).slice(0, 4).map((item: any) => (
              <ListingCard
                key={item.id}
                ad={normalizeAd(item, "job")}
                onCardClick={() => navigate(`/jobs/${item.id}`)}
                onChat={
                  item.posterId ? () => startChat(item.posterId) : undefined
                }
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}

          <div className="mt-5 text-center">
            <Link href="/jobs">
              <button className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-violet-500 text-violet-600 font-bold hover:bg-violet-500 hover:text-white transition-all duration-200 text-sm">
                {isRTL ? "تصفح كل الوظائف والعمالة" : "Browse All Jobs & Labor"}
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
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
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("home.buyReqs.subtitle")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
              {(buyRequests as any[]).slice(0, 4).map((r: any) => (
                <div
                  key={r.id}
                  className="tap-card flex flex-col h-full bg-card border rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow gap-2 sm:gap-3"
                >
                  {/* ── Header ── */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1">
                        {r.brand || t("home.buyReqs.anyBrand")} {r.model || ""}
                      </h3>
                      {(r.minYear || r.maxYear) && (
                        <p className="text-xs text-muted-foreground">
                          {r.minYear ?? "—"} – {r.maxYear ?? "—"}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0 shrink-0 text-xs px-1.5 py-0.5">
                      <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1" />
                      <span className="hidden sm:inline">
                        {t("nav.buyRequests")}
                      </span>
                    </Badge>
                  </div>

                  {/* ── Price / City ── */}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {r.maxPrice && (
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <DollarSign className="w-3.5 h-3.5 shrink-0" />
                        {isRTL ? "حتى" : "Up to"}{" "}
                        {Number(r.maxPrice).toLocaleString()}{" "}
                        {r.currency ?? "USD"}
                      </span>
                    )}
                    {r.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {r.city}
                      </span>
                    )}
                  </div>

                  {/* ── Description ── */}
                  {r.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {r.description}
                    </p>
                  )}

                  {/* ── Buttons — pinned to bottom ── */}
                  <div className="flex gap-1.5 pt-2 border-t mt-auto">
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-0.5 h-8 text-[10px] font-medium rounded-lg bg-secondary text-foreground whitespace-nowrap active:scale-95 transition-all"
                      onClick={() => setDetailRequest(r)}
                    >
                      <Eye className="w-2.5 h-2.5 shrink-0" />{" "}
                      {t("home.buyReqs.details")}
                    </button>
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-0.5 h-8 text-[10px] font-bold rounded-lg bg-primary text-primary-foreground disabled:opacity-60 whitespace-nowrap active:scale-95 transition-all"
                      disabled={startingChat}
                      onClick={() =>
                        startChatWithBuyer(
                          r.userId,
                          r.id,
                          `مرحباً، رأيت طلب الشراء الخاص بك لـ ${[r.brand, r.model].filter(Boolean).join(" ") || "سيارة"}. أنا لدي ما تبحث عنه!`,
                        )
                      }
                    >
                      {startingChat ? (
                        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0 inline-block" />
                      ) : (
                        <MessageCircle className="w-2.5 h-2.5 shrink-0" />
                      )}
                      {t("home.buyReqs.contact")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/buy-requests">
                <button className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all duration-200 text-sm">
                  {t("home.buyReqs.viewAll")}
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Follow LAZEMNI Social Section ── */}
      <section className="py-10 max-w-7xl mx-auto px-4 w-full">
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-8 text-center border border-primary/10">
          <h2 className="text-2xl font-bold mb-1">
            {isRTL ? "تابع LAZEMNI" : "Follow LAZEMNI"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {isRTL
              ? "ابقَ على اطلاع بأحدث الإعلانات والعروض"
              : "Stay updated with the latest listings and offers"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/profile.php?id=61577551426729"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1877F2] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </a>
            {/* Instagram */}
            <a
              href="https://www.instagram.com/lazemni_official/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Instagram
            </a>
            {/* WhatsApp Channel */}
            <a
              href="https://whatsapp.com/channel/0029Vb7vvIf65yD3DNRPrG2Z"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@lazemni_official?is_from_webapp=1&sender_device=pc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#010101] text-white font-bold text-sm hover:opacity-80 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
              </svg>
              TikTok
            </a>
          </div>
        </div>
      </section>

      {/* Missing Cars Section */}
      {(missingCars as any[]).filter((c: any) => c.isFound !== "yes").length >
        0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 w-full">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-amber-500 rounded-full inline-block"></span>
                {isRTL ? "سيارات مفقودة" : "Missing Cars"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isRTL
                  ? "إذا رأيت إحدى هذه السيارات، أبلغ الإدارة"
                  : "If you see any of these cars, notify the admin"}
              </p>
            </div>
            <Link
              href="/missing-cars"
              className="text-amber-600 font-semibold flex items-center gap-1 hover:underline text-sm"
            >
              {isRTL ? "عرض الكل" : "View All"}{" "}
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(missingCars as any[])
              .filter((c: any) => c.isFound !== "yes")
              .slice(0, 4)
              .map((c: any) => (
                <div
                  key={c.id}
                  className="bg-card border-2 border-amber-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {c.image ? (
                    <img
                      src={imgUrl(c.image)}
                      alt={c.brand ?? (isRTL ? "سيارة" : "Car")}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-amber-50 flex items-center justify-center">
                      <AlertTriangle className="w-12 h-12 text-amber-300" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground text-sm">
                        {[c.brand, c.model].filter(Boolean).join(" ") ||
                          (isRTL ? "سيارة مجهولة" : "Unknown Car")}
                      </h4>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        {isRTL ? "مفقودة" : "Missing"}
                      </Badge>
                    </div>
                    {c.color && (
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? `اللون: ${c.color}` : `Color: ${c.color}`}
                      </p>
                    )}
                    {c.plateNumber && (
                      <p className="text-xs font-bold text-foreground">
                        {isRTL
                          ? `لوحة: ${c.plateNumber}`
                          : `Plate: ${c.plateNumber}`}
                      </p>
                    )}
                    {c.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {c.city}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full mt-2 rounded-xl text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                      onClick={() => {
                        setMissingInfoCarId(c.id);
                        setMissingInfoOpen(true);
                      }}
                    >
                      <Send className="w-3 h-3" />{" "}
                      {isRTL
                        ? "إرسال معلومات إلى الإدارة"
                        : "Send Info to Admin"}
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
            <DialogTitle className="text-xl font-bold">
              {t("home.missingInfo.title")}
            </DialogTitle>
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
              {sendingInfo
                ? t("home.missingInfo.sending")
                : t("home.missingInfo.send")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setMissingInfoOpen(false)}
              className="rounded-xl"
            >
              {t("home.missingInfo.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Report — Full Widget */}
      <section className="py-16 px-4 bg-gradient-to-b from-background to-secondary/10">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-bold px-4 py-2 rounded-full mb-4">
              <FileSearch2 className="w-4 h-4" />
              استعلام فوري عن أي مركبة
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              تقرير تاريخ المركبة
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              أدخل رقم الشاسيه (VIN) للحصول على تقرير يتضمن مواصفات المركبة،
              الاستدعاءات الرسمية، وعدد الشكاوى المسجلة لدى NHTSA.
            </p>
          </div>
          <VehicleReportWidget />
        </div>
      </section>

      {/* Buy Request Details Dialog */}
      {detailRequest && (
        <Dialog
          open={!!detailRequest}
          onOpenChange={(open) => {
            if (!open) setDetailRequest(null);
          }}
        >
          <DialogContent
            className="max-w-md w-full rounded-2xl p-0 overflow-hidden"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CartIcon className="w-5 h-5 text-primary" />
                {t("home.buyReqs.detailDialog.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4" />{" "}
                  {t("home.buyReqs.detailDialog.vehicle")}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("home.buyReqs.detailDialog.brand")}{" "}
                    </span>
                    <span className="font-medium">
                      {detailRequest.brand || t("home.buyReqs.anyBrand")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("home.buyReqs.detailDialog.model")}{" "}
                    </span>
                    <span className="font-medium">
                      {detailRequest.model || t("home.buyReqs.anyModel")}
                    </span>
                  </div>
                  {(detailRequest.minYear || detailRequest.maxYear) && (
                    <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {detailRequest.minYear ?? "—"} –{" "}
                        {detailRequest.maxYear ?? "—"}
                      </span>
                    </div>
                  )}
                  {detailRequest.maxPrice && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        {t("home.buyReqs.detailDialog.maxPrice")}{" "}
                      </span>
                      <span className="font-bold text-primary">
                        {Number(detailRequest.maxPrice).toLocaleString()}{" "}
                        {detailRequest.currency ?? "USD"}
                      </span>
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
                  <p className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                    <FileText className="w-4 h-4" />{" "}
                    {t("home.buyReqs.detailDialog.notes")}
                  </p>
                  <p className="text-sm leading-relaxed bg-muted/20 rounded-xl p-3 whitespace-pre-wrap">
                    {detailRequest.description}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 gap-1.5 h-11 rounded-xl"
                  disabled={startingChat}
                  onClick={() => {
                    setDetailRequest(null);
                    startChatWithBuyer(
                      detailRequest.userId,
                      detailRequest.id,
                      `مرحباً، رأيت طلب الشراء الخاص بك لـ ${[detailRequest.brand, detailRequest.model].filter(Boolean).join(" ") || "سيارة"}. أنا لدي ما تبحث عنه!`,
                    );
                  }}
                >
                  {startingChat ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  {t("home.buyReqs.detailDialog.contactBuyer")}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl px-4"
                  onClick={() => setDetailRequest(null)}
                >
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
    queryFn: () =>
      fetch(withApi("/api/showrooms/featured")).then((r) => r.json()),
    staleTime: 60_000,
  });

  const list = Array.isArray(showrooms) ? showrooms : [];
  if (isLoading || list.length === 0) return null;

  return (
    <section
      className="py-10 w-full bg-gradient-to-br from-primary/5 to-primary/10"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="w-1 h-7 bg-primary rounded-full inline-block"></span>
              <Building2 className="w-5 h-5 text-primary" />
              معارض سيارات مميزة
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5 mr-5">
              معارض موثّقة ومميّزة على المنصة
            </p>
          </div>
          <Link
            href="/showrooms"
            className="flex items-center gap-1 text-primary text-sm font-bold hover:underline"
          >
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-4 lg:grid-cols-6 sm:overflow-x-visible"
          style={{ scrollbarWidth: "none" }}
        >
          {list.map((showroom: any) => (
            <Link
              key={showroom.id}
              href={`/showroom/${showroom.id}`}
              className="group snap-start flex-shrink-0 w-36 sm:w-auto"
            >
              <div className="bg-card border rounded-2xl p-4 text-center hover:shadow-md hover:border-primary/30 transition-all h-full">
                <div className="w-14 h-14 rounded-xl border bg-muted mx-auto mb-3 overflow-hidden flex items-center justify-center">
                  {showroom.logo ? (
                    <img
                      src={showroom.logo}
                      alt={showroom.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-primary/40" />
                  )}
                </div>
                <p className="font-bold text-xs text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                  {showroom.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5 mt-1.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {showroom.city}
                </p>
                {showroom.isVerified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-semibold mt-1">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />{" "}
                    مميز
                  </span>
                )}
              </div>
            </Link>
          ))}
          {/* View all card */}
          <Link
            href="/showrooms"
            className="snap-start flex-shrink-0 w-36 sm:w-auto"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center hover:bg-primary/20 transition-all h-full flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <p className="font-bold text-xs text-primary">عرض كل المعارض</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
