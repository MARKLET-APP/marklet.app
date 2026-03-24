import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Heart, Share2, Play, Upload, ChevronUp, ChevronDown,
  BadgeCheck, Eye, Phone, Loader2, Store,
  ShieldCheck, X, Building2, CheckCircle2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reel {
  id: number;
  videoUrl: string;
  thumbnailUrl?: string | null;
  title: string;
  desc?: string | null;
  views: number;
  likes: number;
  sponsored?: string | null;
  city?: string | null;
  price?: string | null;
  dealerName?: string | null;
  status: string;
  dealerId?: number | null;
}

// ─── Demo reels (fallback) ────────────────────────────────────────────────────

const DEMO_REELS: Reel[] = [
  {
    id: -1, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl: null, title: "تويوتا كامري 2022",
    desc: "حالة ممتازة · فحص كامل · سعر مميز",
    views: 3241, likes: 128, sponsored: "true",
    city: "دمشق", price: "12,500 $", status: "approved",
    dealerId: null, dealerName: "معرض الأمانة",
  },
  {
    id: -2, videoUrl: "https://www.w3schools.com/html/movie.mp4",
    thumbnailUrl: null, title: "هيونداي سوناتا 2021",
    desc: "لون لؤلؤي · كيلو منخفض · نظيفة جداً",
    views: 1870, likes: 64, sponsored: "false",
    city: "حلب", price: "9,800 $", status: "approved",
    dealerId: null, dealerName: "معرض الشمال",
  },
];

// ─── Admin ID cache ────────────────────────────────────────────────────────────

let _adminIdCache: number | null = null;
let _adminIdFetched = false;
async function fetchAdminId(): Promise<number | null> {
  if (_adminIdFetched) return _adminIdCache;
  _adminIdFetched = true;
  try {
    const d = await apiRequest<{ adminId: number | null }>("/api/system/admin-id");
    _adminIdCache = d?.adminId ?? null;
  } catch {}
  return _adminIdCache;
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel({ onApprove, onReject, onClose }: {
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Reel[]>("/api/admin/reels/pending")
      .then(data => setPending(Array.isArray(data) ? data : []))
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> مراجعة الفيديوهات
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-white/40" /></div>
        ) : pending.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400/50" />
            <p className="text-white/50">لا توجد فيديوهات بانتظار المراجعة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {r.thumbnailUrl
                    ? <img src={r.thumbnailUrl} alt={r.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/30" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{r.title}</p>
                    {r.dealerName && <p className="text-white/50 text-xs">{r.dealerName}</p>}
                    {r.price && <p className="text-amber-400 text-xs">{r.price}</p>}
                    {r.city && <p className="text-white/40 text-xs">{r.city}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { onApprove(r.id); setPending(p => p.filter(x => x.id !== r.id)); }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-2 text-sm"
                  >✅ قبول</button>
                  <button
                    onClick={() => { onReject(r.id); setPending(p => p.filter(x => x.id !== r.id)); }}
                    className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-xl py-2 text-sm"
                  >❌ رفض</button>
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

function ReelCard({ reel, isActive, onLikeUpdate, safeBottom }: {
  reel: Reel; isActive: boolean; safeBottom: number;
  onLikeUpdate: (id: number, likes: number) => void;
}) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setLocalLikes(reel.likes); }, [reel.likes]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => {});
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

  const handleLike = async () => {
    if (!user) { navigate("/login"); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    const optimistic = newLiked ? localLikes + 1 : localLikes - 1;
    setLocalLikes(optimistic);
    if (reel.id > 0) {
      try {
        const data = await apiRequest<{ ok: boolean; likes: number }>(
          `/api/reels/${reel.id}/like`, "POST", { action: newLiked ? "like" : "unlike" }
        );
        if (data?.likes !== undefined) {
          setLocalLikes(data.likes);
          onLikeUpdate(reel.id, data.likes);
        }
      } catch {}
    }
  };

  // Share: open native share dialog, fallback to clipboard
  const handleShare = async () => {
    const url = `${window.location.origin}?video=${reel.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: reel.title, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "✅ تم نسخ رابط الفيديو" });
      } catch {
        toast({ title: "تعذّر مشاركة الرابط", variant: "destructive" });
      }
    }
  };

  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    if (reel.dealerId && reel.dealerId > 0) {
      navigate(`/messages?userId=${reel.dealerId}`);
    } else {
      const adminId = await fetchAdminId();
      navigate(adminId ? `/messages?userId=${adminId}` : "/messages");
    }
  };

  const infoPb = safeBottom + 8;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop muted playsInline preload="auto"
        onCanPlay={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
        poster={reel.thumbnailUrl || undefined}
      />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {reel.thumbnailUrl && <img src={reel.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <Loader2 className="w-10 h-10 text-white/50 animate-spin relative z-10" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {!playing && loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}

      {reel.sponsored === "true" && (
        <div className="absolute top-16 left-4 z-10">
          <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            <BadgeCheck className="w-3 h-3" /> ممول
          </span>
        </div>
      )}

      {/* Bottom info */}
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
            <span className="flex items-center gap-1 text-white/60 text-xs">
              <Eye className="w-3 h-3" /> {reel.views.toLocaleString("ar-EG")}
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleContact}
              className="flex items-center gap-1.5 bg-white text-black font-bold rounded-full px-4 py-2 text-xs shadow-lg active:scale-95 transition-transform"
            >
              <Phone className="w-3.5 h-3.5" /> تواصل الآن
            </button>
            {reel.dealerId && reel.dealerId > 0 && (
              <button
                onClick={() => navigate(`/showroom/${reel.dealerId}`)}
                className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold rounded-full px-4 py-2 text-xs active:scale-95 transition-transform"
              >
                <Store className="w-3.5 h-3.5" /> المعرض
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side actions */}
      <div
        className="absolute left-3 flex flex-col items-center gap-5"
        style={{ bottom: infoPb + 80 }}
        dir="ltr"
      >
        {/* Like button */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all",
            liked ? "bg-red-500" : "bg-black/40 backdrop-blur-sm border border-white/10"
          )}>
            <Heart className={cn("w-5 h-5", liked ? "fill-white text-white" : "text-white")} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{localLikes}</span>
        </button>

        {/* Share button — opens native share dialog */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg active:scale-90">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">مشاركة</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [feed, setFeed] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [safeBottom, setSafeBottom] = useState(20);
  const [safeTop, setSafeTop] = useState(0);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);width:1px;pointer-events:none;";
    document.body.appendChild(el);
    setSafeBottom(Math.max(el.getBoundingClientRect().height || 0, 20));
    document.body.removeChild(el);

    const el2 = document.createElement("div");
    el2.style.cssText = "position:fixed;top:0;height:env(safe-area-inset-top,0px);width:1px;pointer-events:none;";
    document.body.appendChild(el2);
    setSafeTop(el2.getBoundingClientRect().height || 0);
    document.body.removeChild(el2);
  }, []);

  const loadFeed = useCallback(() => {
    setLoading(true);
    apiRequest<Reel[]>("/api/reels")
      .then(data => {
        const list = Array.isArray(data) && data.length > 0 ? data : DEMO_REELS;
        setFeed([...list].sort((a, b) => {
          if (a.sponsored === "true" && b.sponsored !== "true") return -1;
          if (a.sponsored !== "true" && b.sponsored === "true") return 1;
          return (b.views || 0) - (a.views || 0);
        }));
      })
      .catch(() => setFeed(DEMO_REELS))
      .finally(() => setLoading(false));

    if (user?.role === "admin") {
      apiRequest<Reel[]>("/api/admin/reels/pending")
        .then(p => setPendingCount(Array.isArray(p) ? p.length : 0))
        .catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

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

  const handleLikeUpdate = (id: number, likes: number) => {
    setFeed(prev => prev.map(r => r.id === id ? { ...r, likes } : r));
  };

  const handleApprove = async (id: number) => {
    await apiRequest(`/api/admin/reels/${id}/approve`, "PATCH").catch(() => {});
    loadFeed();
  };

  const handleReject = async (id: number) => {
    await apiRequest(`/api/admin/reels/${id}/reject`, "PATCH").catch(() => {});
    loadFeed();
  };

  const btnTop = safeTop + 12;

  return (
    <div className="fixed inset-0 bg-black z-10 overflow-hidden">
      {/* Upload button */}
      {(user?.role === "admin" || user?.role === "dealer") && (
        <button
          onClick={() => navigate("/reels/upload")}
          className="absolute right-4 z-30 flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-white/25 active:scale-95 transition-all"
          style={{ top: btnTop }}
        >
          <Upload className="w-4 h-4" /> رفع فيديو
        </button>
      )}

      {/* Refresh */}
      <button
        onClick={loadFeed}
        className="absolute right-4 z-30 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-95 transition-all"
        style={{ top: btnTop + (user?.role === "admin" || user?.role === "dealer" ? 52 : 0) }}
      >
        <RefreshCw className={cn("w-4 h-4 text-white", loading && "animate-spin")} />
      </button>

      {/* Admin review button */}
      {user?.role === "admin" && (
        <button
          onClick={() => setShowAdmin(true)}
          className="absolute left-4 z-30 flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-emerald-500/30 active:scale-95 transition-all"
          style={{ top: btnTop }}
        >
          <ShieldCheck className="w-4 h-4" />
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          مراجعة
        </button>
      )}

      {/* Nav arrows */}
      {activeIndex > 0 && (
        <button
          onClick={() => scrollTo(activeIndex - 1)}
          className="absolute right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white"
          style={{ top: btnTop + 100 }}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {activeIndex < feed.length - 1 && (
        <button
          onClick={() => scrollTo(activeIndex + 1)}
          className="absolute right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white"
          style={{ bottom: safeBottom + 12 }}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Progress dots */}
      {feed.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 z-30 flex gap-1.5" style={{ top: btnTop + 6 }}>
          {feed.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)}
              className={cn("rounded-full transition-all", i === activeIndex ? "bg-white w-4 h-2" : "bg-white/30 w-2 h-2")} />
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && feed.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-white/40 animate-spin" />
        </div>
      )}

      {/* Feed */}
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
              onLikeUpdate={handleLikeUpdate}
              safeBottom={safeBottom}
            />
          </div>
        ))}
      </div>

      {showAdmin && (
        <AdminPanel
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => { setShowAdmin(false); loadFeed(); }}
        />
      )}
    </div>
  );
}
