import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Heart, Share2, Play, Upload, ChevronUp, ChevronDown,
  BadgeCheck, Eye, Phone, Loader2, Download, Store,
  ShieldCheck, X, Building2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReelStatus = "approved" | "pending" | "rejected";

interface Reel {
  id: number;
  video: string;
  thumbnail?: string;
  title: string;
  desc?: string;
  views: number;
  likes: number;
  sponsored?: boolean;
  city?: string;
  price?: string;
  dealerName?: string;
  status: ReelStatus;
  dealerId?: number | null;
}

// ─── Demo reels ───────────────────────────────────────────────────────────────

const DEMO_REELS: Reel[] = [
  {
    id: 1,
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    title: "تويوتا كامري 2022",
    desc: "حالة ممتازة · فحص كامل · سعر مميز",
    views: 3241, likes: 128, sponsored: true,
    city: "دمشق", price: "12,500 $", status: "approved",
    dealerId: null, dealerName: "معرض الأمانة",
  },
  {
    id: 2,
    video: "https://www.w3schools.com/html/movie.mp4",
    title: "هيونداي سوناتا 2021",
    desc: "لون لؤلؤي · كيلو منخفض · نظيفة جداً",
    views: 1870, likes: 64, sponsored: false,
    city: "حلب", price: "9,800 $", status: "approved",
    dealerId: null, dealerName: "معرض الشمال",
  },
];

const STORAGE_KEY = "marklet_reels_v2";

function loadAll(): Reel[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Reel[]; } catch { return []; }
}
function saveAll(reels: Reel[]) {
  const demoIds = new Set(DEMO_REELS.map(d => d.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reels.filter(r => !demoIds.has(r.id))));
}
function mergeWithDemos(stored: Reel[]): Reel[] {
  const demoIds = new Set(DEMO_REELS.map(d => d.id));
  return [...DEMO_REELS, ...stored.filter(r => !demoIds.has(r.id))];
}
function sortReels(list: Reel[]): Reel[] {
  return [...list].sort((a, b) => {
    if (a.sponsored && !b.sponsored) return -1;
    if (!a.sponsored && b.sponsored) return 1;
    return b.views - a.views;
  });
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel({ allReels, onApprove, onReject, onClose }: {
  allReels: Reel[]; onApprove: (id: number) => void;
  onReject: (id: number) => void; onClose: () => void;
}) {
  const pending = allReels.filter(r => r.status === "pending");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> مراجعة الفيديوهات</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        {pending.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400/50" />
            <p className="text-white/50">لا توجد فيديوهات بانتظار المراجعة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {r.thumbnail
                    ? <img src={r.thumbnail} alt={r.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center"><Play className="w-6 h-6 text-white/30" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{r.title}</p>
                    {r.dealerName && <p className="text-white/50 text-xs">{r.dealerName}</p>}
                    {r.price && <p className="text-amber-400 text-xs">{r.price}</p>}
                    {r.city && <p className="text-white/40 text-xs">{r.city}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onApprove(r.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-2 text-sm">✅ قبول</button>
                  <button onClick={() => onReject(r.id)} className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-xl py-2 text-sm">❌ رفض</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reel Card ────────────────────────────────────────────────────────────────

function ReelCard({ reel, isActive, onLike, onView, safeBottom }: {
  reel: Reel; isActive: boolean; safeBottom: number;
  onLike: (id: number) => void; onView: (id: number) => void;
}) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => {});
      if (!viewedRef.current) { viewedRef.current = true; onView(reel.id); }
    } else {
      v.pause(); setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleLike = () => {
    if (!user) { navigate("/login"); return; }
    setLiked(l => !l);
    setLocalLikes(c => liked ? c - 1 : c + 1);
    if (!liked) onLike(reel.id);
  };

  const handleShare = async () => {
    const url = `${location.origin}?video=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, text: reel.desc, url });
      else { await navigator.clipboard.writeText(url); toast({ title: "✅ تم نسخ الرابط" }); }
    } catch { }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = reel.video; a.download = `${reel.title}.mp4`; a.click();
  };

  const handleContact = () => {
    if (!user) { navigate("/login"); return; }
    if (reel.dealerId) navigate(`/messages?userId=${reel.dealerId}`);
    else navigate("/messages");
  };

  // Bottom safe offset for info panel
  const infoPb = safeBottom + 8;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* ── VIDEO ── */}
      <video
        ref={videoRef}
        src={reel.video}
        className="absolute inset-0 w-full h-full object-cover"
        loop muted playsInline preload="auto"
        onCanPlay={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
        poster={reel.thumbnail}
      />

      {/* Loading */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {reel.thumbnail && <img src={reel.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <Loader2 className="w-10 h-10 text-white/50 animate-spin relative z-10" />
        </div>
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* Pause indicator */}
      {!playing && loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Sponsored badge */}
      {reel.sponsored && (
        <div className="absolute top-16 left-4 z-10">
          <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            <BadgeCheck className="w-3 h-3" /> ممول
          </span>
        </div>
      )}

      {/* ── BOTTOM INFO ── */}
      <div
        className="absolute bottom-0 right-0 left-16 pointer-events-none"
        style={{ paddingBottom: infoPb }}
        dir="rtl"
      >
        <div className="px-4 pb-2 pointer-events-auto">
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">{reel.title}</h3>
          {reel.price && <p className="text-amber-400 font-bold text-base mt-0.5">{reel.price}</p>}
          {reel.dealerName && (
            <p className="flex items-center gap-1 text-white/70 text-xs mt-0.5 font-medium">
              <Building2 className="w-3 h-3" /> {reel.dealerName}
            </p>
          )}
          {reel.desc && <p className="text-white/80 text-sm mt-1 line-clamp-2 drop-shadow">{reel.desc}</p>}
          <div className="flex items-center gap-3 mt-1.5">
            {reel.city && <span className="text-white/60 text-xs">{reel.city}</span>}
            <span className="flex items-center gap-1 text-white/60 text-xs"><Eye className="w-3 h-3" /> {reel.views.toLocaleString()}</span>
          </div>
          {reel.dealerId && (
            <div className="flex gap-2 mt-3">
              <button onClick={handleContact} className="flex items-center gap-1.5 bg-white text-black font-bold rounded-full px-4 py-2 text-xs shadow-lg active:scale-95 transition-transform">
                <Phone className="w-3.5 h-3.5" /> تواصل الآن
              </button>
              <button onClick={() => navigate(`/showroom/${reel.dealerId}`)} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold rounded-full px-4 py-2 text-xs active:scale-95 transition-transform">
                <Store className="w-3.5 h-3.5" /> المعرض
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SIDE ACTIONS ── */}
      <div
        className="absolute left-3 flex flex-col items-center gap-5"
        style={{ bottom: infoPb + 80 }}
        dir="ltr"
      >
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all", liked ? "bg-red-500" : "bg-black/40 backdrop-blur-sm border border-white/10")}>
            <Heart className={cn("w-5 h-5", liked ? "fill-white text-white" : "text-white")} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{localLikes}</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg active:scale-90">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">مشاركة</span>
        </button>
        <button onClick={handleDownload} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg active:scale-90">
            <Download className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">تحميل</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [allReels, setAllReels] = useState<Reel[]>(() => mergeWithDemos(loadAll()));
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Detect safe-area-inset-bottom
  const [safeBottom, setSafeBottom] = useState(20);
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);width:1px;pointer-events:none;";
    document.body.appendChild(el);
    const h = el.getBoundingClientRect().height || 20;
    setSafeBottom(Math.max(h, 20));
    document.body.removeChild(el);
  }, []);

  // Safe-area-inset-top
  const [safeTop, setSafeTop] = useState(0);
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:0;height:env(safe-area-inset-top,0px);width:1px;pointer-events:none;";
    document.body.appendChild(el);
    setSafeTop(el.getBoundingClientRect().height || 0);
    document.body.removeChild(el);
  }, []);

  const feed = sortReels(allReels.filter(r => r.status === "approved"));
  const pendingCount = allReels.filter(r => r.status === "pending").length;

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll("[data-reel-index]");
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActiveIndex(Number((e.target as HTMLElement).dataset.reelIndex ?? 0));
      });
    }, { threshold: 0.6, root: container });
    cards.forEach(c => observerRef.current?.observe(c));
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [feed.length, setupObserver]);

  const scrollTo = (idx: number) => {
    const c = containerRef.current;
    if (c) c.scrollTo({ top: c.clientHeight * idx, behavior: "smooth" });
  };

  const mutate = (updater: (prev: Reel[]) => Reel[]) => {
    setAllReels(prev => { const next = updater(prev); saveAll(next); return next; });
  };

  const handleLike = (id: number) => mutate(prev => prev.map(r => r.id === id ? { ...r, likes: r.likes + 1 } : r));
  const handleView = (id: number) => mutate(prev => prev.map(r => r.id === id ? { ...r, views: r.views + 1 } : r));
  const handleApprove = (id: number) => mutate(prev => prev.map(r => r.id === id ? { ...r, status: "approved" as ReelStatus } : r));
  const handleReject = (id: number) => mutate(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" as ReelStatus } : r));

  // Header button top offset
  const btnTop = safeTop + 12;

  return (
    <div className="fixed inset-0 bg-black z-10 overflow-hidden">
      {/* ── Upload button ── */}
      <button
        onClick={() => navigate("/reels/upload")}
        className="absolute right-4 z-30 flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-white/25 active:scale-95 transition-all"
        style={{ top: btnTop }}
      >
        <Upload className="w-4 h-4" /> رفع فيديو
      </button>

      {/* ── Admin button ── */}
      {user?.role === "admin" && (
        <button
          onClick={() => setShowAdmin(true)}
          className="absolute left-4 z-30 flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-emerald-500/30 active:scale-95 transition-all"
          style={{ top: btnTop }}
        >
          <ShieldCheck className="w-4 h-4" />
          {pendingCount > 0 && <span className="bg-red-500 text-white text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">{pendingCount}</span>}
          مراجعة
        </button>
      )}

      {/* ── Nav arrows ── */}
      {activeIndex > 0 && (
        <button onClick={() => scrollTo(activeIndex - 1)} className="absolute right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white"
          style={{ top: btnTop + 52 }}>
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {activeIndex < feed.length - 1 && (
        <button onClick={() => scrollTo(activeIndex + 1)} className="absolute right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white"
          style={{ bottom: safeBottom + 12 }}>
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── Progress dots ── */}
      {feed.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 z-30 flex gap-1.5" style={{ top: btnTop + 6 }}>
          {feed.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)}
              className={cn("rounded-full transition-all", i === activeIndex ? "bg-white w-4 h-2" : "bg-white/30 w-2 h-2")} />
          ))}
        </div>
      )}

      {/* ── Feed ── */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {feed.map((reel, i) => (
          <div
            key={reel.id}
            data-reel-index={i}
            className="w-full snap-center snap-always flex-shrink-0"
            style={{ height: "100dvh" }}
          >
            <ReelCard
              reel={reel}
              isActive={i === activeIndex}
              onLike={handleLike}
              onView={handleView}
              safeBottom={safeBottom}
            />
          </div>
        ))}
      </div>

      {showAdmin && (
        <AdminPanel
          allReels={allReels}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
