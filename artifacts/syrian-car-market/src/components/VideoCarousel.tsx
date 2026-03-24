import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Share2, MessageCircle,
  Store, Eye, BadgeCheck, Play, Volume2, VolumeX, Building2,
  X, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wa = `https://wa.me/?text=${encodeURIComponent(title + "\n" + url)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border rounded-t-3xl w-full max-w-sm p-5"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-foreground">مشاركة الفيديو</h3>
        </div>

        <div className="flex justify-around mb-5">
          <a href={wa} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center shadow">
              <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.555 4.118 1.524 5.847L.057 23.928c-.073.284.198.55.48.47l6.214-1.64A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 0 1-5.012-1.37l-.36-.213-3.688.974.986-3.6-.234-.37A9.818 9.818 0 0 1 2.182 12C2.182 6.578 6.578 2.182 12 2.182c5.421 0 9.818 4.396 9.818 9.818 0 5.421-4.397 9.818-9.818 9.818z"/></svg>
            </div>
            <span className="text-xs text-foreground">واتساب</span>
          </a>
          <a href={tg} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-[#229ED9] flex items-center justify-center shadow">
              <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </div>
            <span className="text-xs text-foreground">تيليغرام</span>
          </a>
          <a href={fb} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-[#1877F2] flex items-center justify-center shadow">
              <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <span className="text-xs text-foreground">فيسبوك</span>
          </a>
          <button onClick={copyLink} className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow transition-colors",
              copied ? "bg-emerald-500" : "bg-muted"
            )}>
              {copied ? <Check className="w-7 h-7 text-white" /> : <Copy className="w-7 h-7 text-muted-foreground" />}
            </div>
            <span className="text-xs text-foreground">{copied ? "تم النسخ!" : "نسخ"}</span>
          </button>
        </div>

        <div className="bg-muted rounded-xl px-3 py-2.5 flex items-center gap-2">
          <span className="text-muted-foreground text-xs flex-1 truncate text-left" dir="ltr">{url}</span>
          <button onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [showShare, setShowShare] = useState(false);
  const { user } = useAuthStore();
  const [, navigate] = useLocation();

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

  // Share: native share sheet on mobile, custom modal on desktop
  const handleShare = async () => {
    const url = `${window.location.origin}?video=${current.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: current.title, url }); return; } catch {}
    }
    setShowShare(true);
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

      {showShare && (
        <ShareModal
          url={`${window.location.origin}?video=${current.id}`}
          title={current.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </section>
  );
}
