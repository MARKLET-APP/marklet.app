import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Heart, Share2, Play, Upload,
  BadgeCheck, Eye, Phone, Loader2, Store,
  ShieldCheck, X, Building2, CheckCircle2, RefreshCw,
  Video, Volume2, VolumeX, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { ShareSheet } from "@/components/ShareSheet";

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
  showroomOwnerId?: number | null;
}

// ─── Demo reels (fallback) ────────────────────────────────────────────────────

const DEMO_REELS: Reel[] = [
  {
    id: -1, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl: null, title: "تويوتا كامري 2022",
    desc: "حالة ممتازة · فحص كامل · سعر مميز",
    views: 3241, likes: 128, sponsored: "true",
    city: "دمشق", price: "12,500 $", status: "approved",
    dealerId: null, dealerName: "معرض الأمانة", showroomOwnerId: null,
  },
  {
    id: -2, videoUrl: "https://www.w3schools.com/html/movie.mp4",
    thumbnailUrl: null, title: "هيونداي سوناتا 2021",
    desc: "لون لؤلؤي · كيلو منخفض · نظيفة جداً",
    views: 1870, likes: 64, sponsored: "false",
    city: "حلب", price: "9,800 $", status: "approved",
    dealerId: null, dealerName: "معرض الشمال", showroomOwnerId: null,
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

// ─── Admin Panel (bottom sheet) ───────────────────────────────────────────────

function AdminPanel({ onApprove, onReject, onClose }: {
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReel, setPreviewReel] = useState<Reel | null>(null);

  useEffect(() => {
    apiRequest<Reel[]>("/api/admin/reels/pending")
      .then(data => setPending(Array.isArray(data) ? data : []))
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  }, []);

  const doApprove = (id: number) => {
    onApprove(id);
    setPending(p => p.filter(x => x.id !== id));
    setPreviewReel(null);
  };
  const doReject = (id: number) => {
    onReject(id);
    setPending(p => p.filter(x => x.id !== id));
    setPreviewReel(null);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-[#111] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> مراجعة الفيديوهات
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400/50" />
                <p className="text-white/50">لا توجد فيديوهات بانتظار المراجعة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(r => (
                  <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    {/* Thumbnail row */}
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => setPreviewReel(r)}
                        className="relative flex-shrink-0 rounded-xl overflow-hidden bg-white/10 active:scale-95 transition-transform group"
                        style={{ width: 80, height: 60 }}
                      >
                        {r.thumbnailUrl
                          ? <img src={r.thumbnailUrl} alt={r.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-6 h-6 text-white/30" />
                            </div>
                        }
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-snug line-clamp-1">{r.title}</p>
                        {r.dealerName && <p className="text-white/50 text-xs mt-0.5">{r.dealerName}</p>}
                        <div className="flex gap-3 mt-0.5">
                          {r.price && <span className="text-amber-400 text-xs font-bold">{r.price}</span>}
                          {r.city && <span className="text-white/40 text-xs">{r.city}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2 px-3 pb-3">
                      <button
                        onClick={() => setPreviewReel(r)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl py-2 text-sm transition-all"
                      >
                        <Play className="w-4 h-4" /> معاينة
                      </button>
                      <button
                        onClick={() => doApprove(r.id)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl py-2 text-sm transition-all"
                      >
                        ✅ قبول
                      </button>
                      <button
                        onClick={() => doReject(r.id)}
                        className="flex-1 bg-red-500/80 hover:bg-red-600 active:scale-95 text-white font-bold rounded-xl py-2 text-sm transition-all"
                      >
                        ❌ رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video preview full screen */}
      {previewReel && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col" onClick={() => setPreviewReel(null)}>
          <div className="flex-1 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => setPreviewReel(null)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="text-right">
                <p className="text-white font-bold text-sm">{previewReel.title}</p>
                {previewReel.dealerName && <p className="text-white/50 text-xs">{previewReel.dealerName}</p>}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center bg-black">
              <video
                key={previewReel.id}
                src={previewReel.videoUrl}
                className="w-full h-full object-contain"
                controls autoPlay playsInline loop
              />
            </div>
            <div
              className="flex-shrink-0 bg-[#111] border-t border-white/10 p-4 space-y-2"
              style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="flex flex-wrap gap-2 text-sm">
                {previewReel.price && <span className="text-amber-400 font-bold">{previewReel.price}</span>}
                {previewReel.city && <span className="text-white/60">{previewReel.city}</span>}
              </div>
              {previewReel.desc && <p className="text-white/70 text-sm">{previewReel.desc}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => doApprove(previewReel.id)}
                  className="flex-1 bg-emerald-500 active:scale-95 text-white font-bold rounded-xl py-3 text-sm"
                >
                  ✅ نشر الفيديو
                </button>
                <button
                  onClick={() => doReject(previewReel.id)}
                  className="flex-1 bg-red-500/80 active:scale-95 text-white font-bold rounded-xl py-3 text-sm"
                >
                  ❌ رفض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Reel Card (square video + info below) ────────────────────────────────────

const viewedSet = new Set<number>();

function ReelCard({ reel, isActive, onLikeUpdate }: {
  reel: Reel;
  isActive: boolean;
  onLikeUpdate: (id: number, likes: number) => void;
}) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);
  const [playing, setPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => { setLocalLikes(reel.likes); }, [reel.likes]);

  // Autoplay when active, pause when not
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => {});
      // track view
      if (reel.id > 0 && !viewedSet.has(reel.id)) {
        viewedSet.add(reel.id);
        fetch(`/api/reels/${reel.id}/view`, { method: "POST" }).catch(() => {});
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [isActive, reel.id]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleLike = async () => {
    if (!user) { toast({ title: "يجب تسجيل الدخول أولاً" }); navigate("/login"); return; }
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

  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    const ownerId = reel.showroomOwnerId;
    if (ownerId && ownerId > 0) {
      navigate(`/messages?userId=${ownerId}`);
    } else {
      const adminId = await fetchAdminId();
      navigate(adminId ? `/messages?userId=${adminId}` : "/messages");
    }
  };

  return (
    <div className="bg-card border-b" dir="rtl">
      {/* ── Video area (natural/square dimensions) ─────────────────────────── */}
      <div className="relative w-full bg-black" style={{ aspectRatio: "1 / 1" }}>
        {/* Thumbnail placeholder while loading */}
        {!videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            {reel.thumbnailUrl
              ? <img src={reel.thumbnailUrl} alt={reel.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              : null
            }
            <Loader2 className="w-8 h-8 text-white/40 animate-spin relative z-10" />
          </div>
        )}

        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          loop
          muted={muted}
          playsInline
          preload="auto"
          poster={reel.thumbnailUrl || undefined}
          onCanPlay={() => setVideoReady(true)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Play/Pause indicator */}
        {!playing && videoReady && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            onClick={togglePlay}
          >
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Sponsored badge */}
        {reel.sponsored === "true" && (
          <div className="absolute top-3 right-3 z-10">
            <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
              <BadgeCheck className="w-3 h-3" /> ممول
            </span>
          </div>
        )}

        {/* Mute toggle */}
        <button
          onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
        >
          {muted
            ? <VolumeX className="w-4 h-4 text-white" />
            : <Volume2 className="w-4 h-4 text-white" />
          }
        </button>

        {/* Side action buttons — over the video */}
        <div className="absolute left-3 bottom-3 z-10 flex flex-col items-center gap-3">
          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-0.5">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all",
              liked ? "bg-red-500" : "bg-black/50 backdrop-blur-sm border border-white/20"
            )}>
              <Heart className={cn("w-5 h-5", liked ? "fill-white text-white" : "text-white")} />
            </div>
            <span className="text-white text-[10px] font-bold drop-shadow">{localLikes}</span>
          </button>

          {/* Share */}
          <ShareSheet
            options={{
              title: reel.title,
              price: reel.price,
              city: reel.city,
              url: `${window.location.origin}?video=${reel.id}`,
              description: reel.desc,
            }}
            trigger={
              <button className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-[10px] font-bold drop-shadow">مشاركة</span>
              </button>
            }
          />
        </div>

        {/* Views — bottom right over video */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 text-white/70 text-xs">
          <Eye className="w-3 h-3" />
          <span>{reel.views.toLocaleString("ar-EG")}</span>
        </div>
      </div>

      {/* ── Info section below video ───────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-2">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base leading-snug flex-1 line-clamp-2">{reel.title}</h3>
          {reel.price && (
            <span className="text-amber-500 font-bold text-base flex-shrink-0 leading-snug">{reel.price}</span>
          )}
        </div>

        {/* Dealer + city */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          {reel.dealerName && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-primary/60" />
              <span className="font-medium text-foreground/80">{reel.dealerName}</span>
            </span>
          )}
          {reel.city && <span>{reel.city}</span>}
        </div>

        {/* Description */}
        {reel.desc && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{reel.desc}</p>
        )}

        {/* CTA buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleContact}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-bold rounded-xl py-2.5 text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
          >
            <Phone className="w-4 h-4" /> تواصل الآن
          </button>
          {reel.dealerId && reel.dealerId > 0 && (
            <button
              onClick={() => navigate(`/showroom/${reel.dealerId}`)}
              className="flex items-center justify-center gap-1.5 px-4 border-2 rounded-xl py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Store className="w-4 h-4" /> المعرض
            </button>
          )}
        </div>
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

  // IntersectionObserver to track which card is active
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll("[data-reel-index]");
    observerRef.current = new IntersectionObserver(entries => {
      let maxRatio = 0;
      let maxIdx = activeIndex;
      entries.forEach(e => {
        if (e.intersectionRatio > maxRatio) {
          maxRatio = e.intersectionRatio;
          maxIdx = Number((e.target as HTMLElement).dataset.reelIndex ?? 0);
        }
      });
      if (maxRatio > 0.4) setActiveIndex(maxIdx);
    }, { threshold: [0.4, 0.6, 0.8] });
    cards.forEach(c => observerRef.current?.observe(c));
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [feed.length, setupObserver]);

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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">ريلز السيارات</h1>
          {feed.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">{feed.length} فيديو</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={loadFeed}
            className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted active:scale-90 transition-all"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Admin review button */}
          {user?.role === "admin" && (
            <button
              onClick={() => setShowAdmin(true)}
              className="relative flex items-center gap-1.5 bg-primary text-primary-foreground font-bold px-3 py-2 rounded-full text-xs active:scale-95 transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              مراجعة
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {/* Upload button */}
          {(user?.role === "admin" || user?.role === "dealer") && (
            <button
              onClick={() => navigate("/reels/upload")}
              className="flex items-center gap-1.5 border font-bold px-3 py-2 rounded-full text-xs hover:bg-muted active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" /> رفع
            </button>
          )}
        </div>
      </div>

      {/* ── Feed ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">جارٍ تحميل الفيديوهات…</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <Video className="w-16 h-16 text-muted-foreground/30" />
          <p className="font-bold text-lg">لا توجد فيديوهات بعد</p>
          <p className="text-muted-foreground text-sm">كن أول من ينشر فيديو للسيارات</p>
          {(user?.role === "admin" || user?.role === "dealer") && (
            <button
              onClick={() => navigate("/reels/upload")}
              className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-full text-sm mt-2"
            >
              <Upload className="w-4 h-4" /> رفع فيديو
            </button>
          )}
        </div>
      ) : (
        <div ref={containerRef} className="divide-y">
          {feed.map((reel, i) => (
            <div key={reel.id} data-reel-index={i}>
              <ReelCard
                reel={reel}
                isActive={i === activeIndex}
                onLikeUpdate={handleLikeUpdate}
              />
            </div>
          ))}
        </div>
      )}

      {/* Admin panel */}
      {showAdmin && (
        <AdminPanel
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
