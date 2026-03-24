import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Share2, MessageCircle,
  Store, Eye, BadgeCheck, Play, Volume2, VolumeX, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  status: "approved" | "pending" | "rejected";
  dealerId?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "marklet_reels_v2";

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

function getApproved(): Reel[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Reel[];
    const demoIds = new Set(DEMO_REELS.map(d => d.id));
    const merged = [...DEMO_REELS, ...stored.filter(r => !demoIds.has(r.id))];
    return merged
      .filter(r => r.status === "approved")
      .sort((a, b) => {
        if (a.sponsored && !b.sponsored) return -1;
        if (!a.sponsored && b.sponsored) return 1;
        return (b.views || 0) - (a.views || 0);
      });
  } catch { return DEMO_REELS; }
}

const viewedSet = new Set<number>();

function trackView(id: number) {
  if (viewedSet.has(id)) return;
  viewedSet.add(id);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Reel[];
    const updated = stored.map(r => r.id === id ? { ...r, views: (r.views || 0) + 1 } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { }
}

function preloadVideo(src: string) {
  const v = document.createElement("video");
  v.src = src;
  v.preload = "auto";
}

// ─── Thumbnail Player ─────────────────────────────────────────────────────────

function ThumbnailPlayer({ reel, muted, onMuteToggle }: {
  reel: Reel;
  muted: boolean;
  onMuteToggle: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // reset when reel changes
  useEffect(() => {
    setPlaying(false);
    setVideoReady(false);
  }, [reel.id]);

  const handlePlay = () => {
    setPlaying(true);
    // wait a tick for video to mount
    setTimeout(() => {
      videoRef.current?.play().catch(() => {});
    }, 50);
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
      {/* Thumbnail or playing video */}
      {!playing ? (
        <>
          {reel.thumbnail
            ? <img src={reel.thumbnail} alt={reel.title} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                <Play className="w-10 h-10 text-white/30" />
              </div>
          }
          <div className="absolute inset-0 bg-black/30" />
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label="تشغيل"
          >
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-xl group-active:scale-90 transition-transform">
              <Play className="w-7 h-7 text-white ml-0.5" />
            </div>
          </button>
        </>
      ) : (
        <>
          <video
            ref={videoRef}
            src={reel.video}
            className="absolute inset-0 w-full h-full object-cover"
            loop muted={muted} playsInline autoPlay
            onCanPlay={() => setVideoReady(true)}
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) v.play(); else v.pause();
            }}
          />
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

      {/* Sponsored badge */}
      {reel.sponsored && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            <BadgeCheck className="w-3 h-3" /> ممول
          </span>
        </div>
      )}

      {/* Mute toggle (only when playing) */}
      {playing && (
        <button
          onClick={onMuteToggle}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          {muted
            ? <VolumeX className="w-4 h-4 text-white" />
            : <Volume2 className="w-4 h-4 text-white" />
          }
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoCarousel() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => { setReels(getApproved()); }, []);

  const current = reels[idx];

  useEffect(() => {
    if (!current) return;
    trackView(current.id);
    setReels(prev => prev.map(r => r.id === current.id ? { ...r, views: r.views + 1 } : r));
    const next = reels[idx + 1];
    if (next) preloadVideo(next.video);
  }, [idx]);

  if (!current) return null;

  const prev = () => setIdx(i => (i - 1 + reels.length) % reels.length);
  const next = () => setIdx(i => (i + 1) % reels.length);

  const handleShare = async () => {
    const url = `${location.origin}?video=${current.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: current.title, text: current.desc || "MARKLET", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "✅ تم نسخ رابط الفيديو" });
      }
    } catch { }
  };

  const handleContact = () => {
    if (!user) { navigate("/login"); return; }
    if (current.dealerId) navigate(`/messages?userId=${current.dealerId}`);
    else navigate("/messages");
  };

  const handleDealer = () => {
    if (current.dealerId) navigate(`/showroom/${current.dealerId}`);
  };

  return (
    <section className="w-full px-3 sm:px-4 py-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full inline-block" />
            فيديوهات السيارات
          </h2>
          <button onClick={() => navigate("/reels")} className="text-xs text-primary font-semibold hover:underline">
            عرض الكل ›
          </button>
        </div>

        <div className="relative bg-card border rounded-2xl overflow-hidden shadow-sm">
          {/* Thumbnail → Video player */}
          <div className="relative">
            <ThumbnailPlayer reel={current} muted={muted} onMuteToggle={() => setMuted(m => !m)} />

            {/* Prev / Next arrows */}
            {reels.length > 1 && (
              <>
                <button onClick={prev} className="absolute top-1/2 right-3 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={next} className="absolute top-1/2 left-3 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dots */}
            {reels.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {reels.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} className={cn("rounded-full transition-all", i === idx ? "bg-white w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5")} />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 sm:p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight truncate">{current.title}</h3>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {current.price && <span className="text-amber-600 font-bold text-sm">{current.price}</span>}
                  {current.city && <span className="text-muted-foreground text-xs">{current.city}</span>}
                  <span className="flex items-center gap-1 text-muted-foreground text-xs"><Eye className="w-3 h-3" /> {current.views.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dealer name */}
            {current.dealerName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                <span className="font-semibold text-foreground/80">{current.dealerName}</span>
              </div>
            )}

            {current.desc && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{current.desc}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-0.5">
              <button onClick={handleShare} className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Share2 className="w-3.5 h-3.5" /> مشاركة
              </button>
              <button onClick={handleContact} className="flex items-center justify-center gap-1.5 flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm">
                <MessageCircle className="w-3.5 h-3.5" /> مراسلة
              </button>
              {current.dealerId && (
                <button onClick={handleDealer} className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Store className="w-3.5 h-3.5" /> المعرض
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
