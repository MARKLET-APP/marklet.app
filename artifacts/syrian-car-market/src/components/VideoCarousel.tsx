import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Share2, MessageCircle,
  Store, Eye, BadgeCheck, Play, Volume2, VolumeX, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
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
  showroomOwnerId?: number | null;
}

// ─── Demo reels (shown when API has no content) ───────────────────────────────

const DEMO_REELS: Reel[] = [
  {
    id: -1,
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl: null,
    title: "تويوتا كامري 2022",
    desc: "حالة ممتازة · فحص كامل · سعر مميز",
    views: 3241, likes: 128, sponsored: "true",
    city: "دمشق", price: "12,500 $", status: "approved",
    dealerId: null, dealerName: "معرض الأمانة",
  },
  {
    id: -2,
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    thumbnailUrl: null,
    title: "هيونداي سوناتا 2021",
    desc: "لون لؤلؤي · كيلو منخفض · نظيفة جداً",
    views: 1870, likes: 64, sponsored: "false",
    city: "حلب", price: "9,800 $", status: "approved",
    dealerId: null, dealerName: "معرض الشمال",
  },
];

const viewedSet = new Set<number>();

// ─── Admin ID cache ───────────────────────────────────────────────────────────

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

// ─── Video Player (autoplay muted, square) ────────────────────────────────────

function VideoPlayer({ reel, muted, onMuteToggle }: {
  reel: Reel;
  muted: boolean;
  onMuteToggle: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener("canplay", tryPlay, { once: true });
    return () => v.removeEventListener("canplay", tryPlay);
  }, [reel.id]);

  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
      {!videoReady && reel.thumbnailUrl && (
        <img
          src={reel.thumbnailUrl}
          alt={reel.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {!videoReady && !reel.thumbnailUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
      )}

      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        autoPlay
        onCanPlay={() => setVideoReady(true)}
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play(); else v.pause();
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Play className="w-12 h-12 text-white/0 transition-opacity" />
      </div>

      {reel.sponsored === "true" && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            <BadgeCheck className="w-3 h-3" /> ممول
          </span>
        </div>
      )}

      <button
        onClick={onMuteToggle}
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        {muted
          ? <VolumeX className="w-4 h-4 text-white" />
          : <Volume2 className="w-4 h-4 text-white" />
        }
      </button>
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

  useEffect(() => {
    apiRequest<Reel[]>("/api/reels")
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setReels(data);
        else setReels(DEMO_REELS);
      })
      .catch(() => setReels(DEMO_REELS));
  }, []);

  const current = reels[idx];

  useEffect(() => {
    if (!current || current.id < 0) return;
    if (viewedSet.has(current.id)) return;
    viewedSet.add(current.id);
    fetch(`/api/reels/${current.id}/view`, { method: "POST" }).catch(() => {});
    setReels(prev => prev.map(r => r.id === current.id ? { ...r, views: r.views + 1 } : r));
  }, [idx]);

  if (!current) return null;

  const prev = () => setIdx(i => (i - 1 + reels.length) % reels.length);
  const next = () => setIdx(i => (i + 1) % reels.length);

  // Share: open native share dialog, fallback to clipboard
  const handleShare = async () => {
    const url = `${window.location.origin}?video=${current.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: current.title, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "✅ تم نسخ رابط الفيديو" });
      } catch {
        toast({ title: "تعذّر مشاركة الرابط", variant: "destructive" });
      }
    }
  };

  // Contact: message the showroom owner directly; fallback to admin
  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    const ownerId = current.showroomOwnerId;
    if (ownerId && ownerId > 0) {
      navigate(`/messages?userId=${ownerId}`);
    } else {
      const adminId = await fetchAdminId();
      navigate(adminId ? `/messages?userId=${adminId}` : "/messages");
    }
  };

  const handleDealer = () => {
    if (current.dealerId && current.dealerId > 0) navigate(`/showroom/${current.dealerId}`);
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
          <div className="relative">
            <VideoPlayer reel={current} muted={muted} onMuteToggle={() => setMuted(m => !m)} />

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

            {reels.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {reels.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} className={cn("rounded-full transition-all", i === idx ? "bg-white w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5")} />
                ))}
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight truncate">{current.title}</h3>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {current.price && <span className="text-amber-600 font-bold text-sm">{current.price}</span>}
                  {current.city && <span className="text-muted-foreground text-xs">{current.city}</span>}
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Eye className="w-3 h-3" /> {current.views.toLocaleString("ar-EG")}
                  </span>
                </div>
              </div>
            </div>

            {current.dealerName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                <span className="font-semibold text-foreground/80">{current.dealerName}</span>
              </div>
            )}

            {current.desc && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{current.desc}</p>}

            <div className="flex gap-2 pt-0.5">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl py-2 text-xs font-bold transition-colors hover:bg-muted"
              >
                <Share2 className="w-3.5 h-3.5" /> مشاركة
              </button>

              <button
                onClick={handleContact}
                className="flex items-center justify-center gap-1.5 flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" /> مراسلة
              </button>

              {current.dealerId && current.dealerId > 0 && (
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
