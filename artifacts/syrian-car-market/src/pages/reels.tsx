import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, Share2, Play, Upload, X, ChevronUp, ChevronDown,
  BadgeCheck, Eye, Car, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reel {
  id: number;
  video: string;
  title: string;
  desc: string;
  views: number;
  likes: number;
  sponsored?: boolean;
  city?: string;
  price?: string;
}

// ─── Demo reels ───────────────────────────────────────────────────────────────

const DEMO_REELS: Reel[] = [
  {
    id: 1,
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    title: "تويوتا كامري 2022",
    desc: "حالة ممتازة · فحص كامل · سعر مميز",
    views: 3241,
    likes: 128,
    sponsored: true,
    city: "دمشق",
    price: "12,500 $",
  },
  {
    id: 2,
    video: "https://www.w3schools.com/html/movie.mp4",
    title: "هيونداي سوناتا 2021",
    desc: "لون لؤلؤي · كيلو متر منخفض · نظيفة جداً",
    views: 1870,
    likes: 64,
    sponsored: false,
    city: "حلب",
    price: "9,800 $",
  },
];

// ─── Persistent storage ───────────────────────────────────────────────────────

function loadReels(): Reel[] {
  try {
    const stored = JSON.parse(localStorage.getItem("marklet_reels") || "[]") as Reel[];
    const demoIds = DEMO_REELS.map(r => r.id);
    const userReels = stored.filter(r => !demoIds.includes(r.id));
    return [...DEMO_REELS, ...userReels];
  } catch {
    return DEMO_REELS;
  }
}

function saveUserReels(reels: Reel[]) {
  const userOnly = reels.filter(r => !DEMO_REELS.find(d => d.id === r.id));
  localStorage.setItem("marklet_reels", JSON.stringify(userOnly));
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (r: Reel) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = () => {
    if (!file) { toast({ title: "اختر فيديو أولاً", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "أضف عنواناً للفيديو", variant: "destructive" }); return; }
    const newReel: Reel = {
      id: Date.now(),
      video: URL.createObjectURL(file),
      title: title.trim(),
      desc: desc.trim(),
      price: price.trim() || undefined,
      city: city.trim() || undefined,
      views: 0,
      likes: 0,
    };
    onUploaded(newReel);
    onClose();
    toast({ title: "✅ تم نشر الفيديو بنجاح!" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">رفع فيديو جديد</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        {/* Video picker */}
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            "relative rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors hover:border-white/40",
            preview ? "h-52" : "h-40"
          )}
        >
          {preview
            ? <video src={preview} className="absolute inset-0 w-full h-full object-cover rounded-2xl" muted />
            : <><Upload className="w-8 h-8 mb-2 text-white/40" /><p className="text-white/50 text-sm">اضغط لاختيار فيديو</p></>
          }
          {preview && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Play className="w-10 h-10 text-white/80" /></div>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان السيارة (مثال: تويوتا كامري 2022)" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر..." rows={2} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none" />
        <div className="grid grid-cols-2 gap-3">
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر (اختياري)" className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="المدينة (اختياري)" className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>

        <button onClick={submit} className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm mt-1 hover:bg-white/90 active:scale-[0.98] transition-all">
          نشر الآن
        </button>
      </div>
    </div>
  );
}

// ─── Single Reel ──────────────────────────────────────────────────────────────

function ReelCard({ reel, isActive }: { reel: Reel; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Play/pause based on visibility
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleLike = () => {
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: reel.title, text: reel.desc, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black overflow-hidden snap-center">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
      />

      {/* Loading spinner */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Play/Pause icon */}
      {!playing && loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Sponsored badge */}
      {reel.sponsored && (
        <div className="absolute top-4 left-4">
          <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            <BadgeCheck className="w-3 h-3" /> ممول
          </span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 right-0 left-16 p-5 pb-6" dir="rtl">
        <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">{reel.title}</h3>
        {reel.price && (
          <p className="text-amber-400 font-bold text-base mt-0.5">{reel.price}</p>
        )}
        <p className="text-white/80 text-sm mt-1 line-clamp-2 drop-shadow">{reel.desc}</p>
        <div className="flex items-center gap-3 mt-2">
          {reel.city && (
            <span className="flex items-center gap-1 text-white/60 text-xs">
              <Car className="w-3 h-3" /> {reel.city}
            </span>
          )}
          <span className="flex items-center gap-1 text-white/60 text-xs">
            <Eye className="w-3 h-3" /> {reel.views.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right action buttons */}
      <div className="absolute bottom-16 left-3 flex flex-col items-center gap-5" dir="ltr">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90",
            liked ? "bg-red-500" : "bg-black/40 backdrop-blur-sm border border-white/10"
          )}>
            <Heart className={cn("w-5 h-5", liked ? "fill-white text-white" : "text-white")} />
          </div>
          <span className="text-white text-xs font-bold">{likeCount}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg active:scale-90">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-bold">مشاركة</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>(() => loadReels());
  const [activeIndex, setActiveIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver to detect active reel
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll("[data-reel-index]");

    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number((entry.target as HTMLElement).dataset.reelIndex ?? 0);
          setActiveIndex(idx);
        }
      });
    }, { threshold: 0.7, root: container });

    cards.forEach(card => observerRef.current?.observe(card));
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [reels, setupObserver]);

  const scrollTo = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const h = container.clientHeight;
    container.scrollTo({ top: h * idx, behavior: "smooth" });
  };

  const handleUploaded = (reel: Reel) => {
    const next = [reel, ...reels];
    setReels(next);
    saveUserReels(next);
    setTimeout(() => scrollTo(0), 100);
  };

  return (
    <div className="fixed inset-0 bg-black z-10 flex flex-col" style={{ top: 0, bottom: 0 }}>
      {/* Upload button */}
      <button
        onClick={() => setShowUpload(true)}
        className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-white/25 active:scale-95 transition-all"
      >
        <Upload className="w-4 h-4" /> رفع فيديو
      </button>

      {/* Navigation arrows */}
      {activeIndex > 0 && (
        <button onClick={() => scrollTo(activeIndex - 1)} className="absolute top-16 right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50">
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {activeIndex < reels.length - 1 && (
        <button onClick={() => scrollTo(activeIndex + 1)} className="absolute bottom-20 right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50">
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {reels.map((_, i) => (
          <button key={i} onClick={() => scrollTo(i)} className={cn(
            "rounded-full transition-all",
            i === activeIndex ? "bg-white w-4 h-2" : "bg-white/30 w-2 h-2"
          )} />
        ))}
      </div>

      {/* Reels container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {reels.map((reel, i) => (
          <div
            key={reel.id}
            data-reel-index={i}
            className="w-full snap-center"
            style={{ height: "100dvh", minHeight: "100dvh" }}
          >
            <ReelCard reel={reel} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />}
    </div>
  );
}
