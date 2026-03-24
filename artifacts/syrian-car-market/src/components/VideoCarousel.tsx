import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Share2, MessageCircle,
  Store, Eye, BadgeCheck, Play, Pause, Volume2, VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reel {
  id: number;
  video: string;
  title: string;
  desc?: string;
  views: number;
  likes: number;
  sponsored?: boolean;
  city?: string;
  price?: string;
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
    city: "دمشق", price: "12,500 $", status: "approved", dealerId: null,
  },
  {
    id: 2,
    video: "https://www.w3schools.com/html/movie.mp4",
    title: "هيونداي سوناتا 2021",
    desc: "لون لؤلؤي · كيلو منخفض · نظيفة جداً",
    views: 1870, likes: 64, sponsored: false,
    city: "حلب", price: "9,800 $", status: "approved", dealerId: null,
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

function trackView(id: number, reels: Reel[], setReels: React.Dispatch<React.SetStateAction<Reel[]>>) {
  if (viewedSet.has(id)) return;
  viewedSet.add(id);
  setReels(prev => {
    const next = prev.map(r => r.id === id ? { ...r, views: (r.views || 0) + 1 } : r);
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Reel[];
      const updated = stored.map(r => r.id === id ? { ...r, views: (r.views || 0) + 1 } : r);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { }
    return next;
  });
}

function preloadVideo(src: string) {
  const v = document.createElement("video");
  v.src = src;
  v.preload = "auto";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoCarousel() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const list = getApproved();
    setReels(list);
  }, []);

  const current = reels[idx];

  useEffect(() => {
    if (!current) return;
    setLoaded(false);
    setPlaying(false);
    const v = videoRef.current;
    if (v) { v.load(); }
    // Preload next
    const next = reels[idx + 1];
    if (next) preloadVideo(next.video);
  }, [idx, reels]);

  useEffect(() => {
    if (current) trackView(current.id, reels, setReels);
  }, [current?.id]);

  if (!current) return null;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
  };

  const prev = () => setIdx(i => (i - 1 + reels.length) % reels.length);
  const next = () => setIdx(i => (i + 1) % reels.length);

  const handleShare = async () => {
    const url = `${location.origin}?video=${current.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: current.title, text: current.desc, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "✅ تم نسخ رابط الفيديو" });
      }
    } catch { }
  };

  const handleContact = () => {
    if (!user) { navigate("/login"); return; }
    if (current.dealerId) {
      navigate(`/messages?userId=${current.dealerId}`);
    } else {
      navigate("/messages");
    }
  };

  const handleDealer = () => {
    if (current.dealerId) navigate(`/showroom/${current.dealerId}`);
  };

  return (
    <section className="w-full px-3 sm:px-4 py-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full inline-block" />
            فيديوهات السيارات
          </h2>
          <button onClick={() => navigate("/reels")} className="text-xs text-primary font-semibold hover:underline">
            عرض الكل ›
          </button>
        </div>

        {/* Card */}
        <div className="relative bg-card border rounded-2xl overflow-hidden shadow-sm">
          {/* Square video */}
          <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
            <video
              ref={videoRef}
              src={current.video}
              className="absolute inset-0 w-full h-full object-cover"
              loop muted={muted} playsInline preload="auto"
              onCanPlay={() => setLoaded(true)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />

            {/* Loading state */}
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Play/Pause center */}
            {loaded && !playing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-7 h-7 text-white ml-0.5" />
                </div>
              </div>
            )}

            {/* Sponsored badge */}
            {current.sponsored && (
              <div className="absolute top-3 right-3 z-10">
                <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                  <BadgeCheck className="w-3 h-3" /> ممول
                </span>
              </div>
            )}

            {/* Mute toggle */}
            <button
              onClick={() => setMuted(m => !m)}
              className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              {muted
                ? <VolumeX className="w-4 h-4 text-white" />
                : <Volume2 className="w-4 h-4 text-white" />
              }
            </button>

            {/* Counter */}
            {reels.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {reels.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={cn(
                      "rounded-full transition-all",
                      i === idx ? "bg-white w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5"
                    )}
                  />
                ))}
              </div>
            )}

            {/* Left nav */}
            {reels.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute top-1/2 right-3 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/70 active:scale-90 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute top-1/2 left-3 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/70 active:scale-90 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Info & Actions */}
          <div className="p-3 sm:p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight truncate">
                  {current.title}
                </h3>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {current.price && (
                    <span className="text-amber-600 font-bold text-sm">{current.price}</span>
                  )}
                  {current.city && (
                    <span className="text-muted-foreground text-xs">{current.city}</span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Eye className="w-3 h-3" /> {current.views.toLocaleString()}
                  </span>
                </div>
              </div>
              {/* Play toggle button */}
              <button
                onClick={togglePlay}
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90",
                  playing
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                )}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            </div>

            {current.desc && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{current.desc}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> مشاركة
              </button>
              <button
                onClick={handleContact}
                className="flex items-center justify-center gap-1.5 flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" /> مراسلة
              </button>
              {current.dealerId && (
                <button
                  onClick={handleDealer}
                  className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
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
