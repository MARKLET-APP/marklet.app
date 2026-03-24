import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Heart, Share2, Play, Upload, X, ChevronUp, ChevronDown,
  BadgeCheck, Eye, Car, Loader2, Download, Store, Phone,
  CheckCircle2, Clock, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReelStatus = "approved" | "pending" | "rejected";

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
  status: ReelStatus;
  dealerId?: number | null;
}

// ─── Demo reels (always approved) ────────────────────────────────────────────

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
    status: "approved",
    dealerId: null,
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
    status: "approved",
    dealerId: null,
  },
];

// ─── Persistent helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = "marklet_reels_v2";

function loadAll(): Reel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Reel[];
  } catch { return []; }
}

function saveAll(reels: Reel[]) {
  const userOnly = reels.filter(r => !DEMO_REELS.find(d => d.id === r.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
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

// ─── Permission helper ────────────────────────────────────────────────────────

function canUpload(role?: string) {
  return role === "admin" || role === "dealer";
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: Reel) => void }) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!canUpload(user?.role)) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg p-8 pb-10 text-center" onClick={e => e.stopPropagation()}>
          <Store className="w-12 h-12 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">ميزة حصرية للمعارض</h2>
          <p className="text-white/60 text-sm mb-6">رفع الفيديوهات متاح فقط للمعارض المشتركة والإدارة</p>
          <button onClick={onClose} className="w-full bg-amber-500 text-black font-bold rounded-xl py-3">موافق</button>
        </div>
      </div>
    );
  }

  const onFile = (f: File) => { setFile(f); setPreview(URL.createObjectURL(f)); };

  const submit = () => {
    if (!file) { toast({ title: "اختر فيديو أولاً", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "أضف عنواناً للفيديو", variant: "destructive" }); return; }
    const isAdmin = user?.role === "admin";
    const newReel: Reel = {
      id: Date.now(),
      video: URL.createObjectURL(file),
      title: title.trim(),
      desc: desc.trim(),
      price: price.trim() || undefined,
      city: city.trim() || undefined,
      views: 0,
      likes: 0,
      sponsored: true,
      status: isAdmin ? "approved" : "pending",
      dealerId: user?.id ?? null,
    };
    onSubmit(newReel);
    onClose();
    toast({ title: isAdmin ? "✅ تم نشر الفيديو" : "📋 تم إرسال الفيديو للمراجعة" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">رفع فيديو جديد</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        {user?.role !== "admin" && (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-xs">سيخضع الفيديو للمراجعة قبل النشر</p>
          </div>
        )}

        <div
          onClick={() => fileRef.current?.click()}
          className={cn("relative rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors hover:border-white/40", preview ? "h-52" : "h-40")}
        >
          {preview
            ? <video src={preview} className="absolute inset-0 w-full h-full object-cover rounded-2xl" muted />
            : <><Upload className="w-8 h-8 mb-2 text-white/40" /><p className="text-white/50 text-sm">اضغط لاختيار فيديو</p></>
          }
          {preview && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Play className="w-10 h-10 text-white/80" /></div>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان السيارة" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر..." rows={2} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none resize-none focus:ring-2 focus:ring-white/20" />
        <div className="grid grid-cols-2 gap-3">
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر" className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="المدينة" className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>
        <button onClick={submit} className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm hover:bg-white/90 active:scale-[0.98] transition-all">
          {user?.role === "admin" ? "نشر الآن" : "إرسال للمراجعة"}
        </button>
      </div>
    </div>
  );
}

// ─── Admin Approval Panel ─────────────────────────────────────────────────────

function AdminPanel({ allReels, onApprove, onReject, onClose }: {
  allReels: Reel[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onClose: () => void;
}) {
  const pending = allReels.filter(r => r.status === "pending");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] text-white rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                  <video src={r.video} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-white/10" muted />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{r.title}</p>
                    {r.price && <p className="text-amber-400 text-xs">{r.price}</p>}
                    {r.city && <p className="text-white/50 text-xs">{r.city}</p>}
                    <p className="text-white/60 text-xs mt-1 line-clamp-1">{r.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onApprove(r.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-2 text-sm">
                    ✅ قبول
                  </button>
                  <button onClick={() => onReject(r.id)} className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-xl py-2 text-sm">
                    ❌ رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single Reel Card ─────────────────────────────────────────────────────────

function ReelCard({ reel, isActive, onLike, onView }: {
  reel: Reel;
  isActive: boolean;
  onLike: (id: number) => void;
  onView: (id: number) => void;
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
      if (!viewedRef.current) {
        viewedRef.current = true;
        onView(reel.id);
      }
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
    if (!user) { navigate("/login"); return; }
    setLiked(l => !l);
    setLocalLikes(c => liked ? c - 1 : c + 1);
    if (!liked) onLike(reel.id);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?reel=${reel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: reel.title, text: reel.desc, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "✅ تم نسخ رابط الفيديو" });
      }
    } catch { }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = reel.video;
    a.download = `${reel.title}.mp4`;
    a.click();
  };

  const handleContact = () => {
    if (!user) { navigate("/login"); return; }
    if (reel.dealerId) navigate(`/messages?userId=${reel.dealerId}`);
  };

  const handleDealer = () => {
    if (reel.dealerId) navigate(`/showroom/${reel.dealerId}`);
  };

  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black overflow-hidden snap-center">
      <video
        ref={videoRef}
        src={reel.video}
        className="absolute inset-0 w-full h-full object-cover"
        loop muted playsInline preload="auto"
        onCanPlay={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
      />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />

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

      {/* Bottom info — right side (RTL) */}
      <div className="absolute bottom-0 right-0 left-16 p-5 pb-6" dir="rtl">
        <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">{reel.title}</h3>
        {reel.price && <p className="text-amber-400 font-bold text-base mt-0.5">{reel.price}</p>}
        <p className="text-white/80 text-sm mt-1 line-clamp-2 drop-shadow">{reel.desc}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {reel.city && <span className="flex items-center gap-1 text-white/60 text-xs"><Car className="w-3 h-3" /> {reel.city}</span>}
          <span className="flex items-center gap-1 text-white/60 text-xs"><Eye className="w-3 h-3" /> {reel.views.toLocaleString()}</span>
        </div>

        {/* CTA buttons */}
        {reel.dealerId && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleContact}
              className="flex items-center gap-1.5 bg-white text-black font-bold rounded-full px-4 py-2 text-xs shadow-lg active:scale-95 transition-transform"
            >
              <Phone className="w-3.5 h-3.5" /> تواصل الآن
            </button>
            <button
              onClick={handleDealer}
              className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold rounded-full px-4 py-2 text-xs active:scale-95 transition-transform"
            >
              <Store className="w-3.5 h-3.5" /> المعرض
            </button>
          </div>
        )}
      </div>

      {/* Right action buttons */}
      <div className="absolute bottom-20 left-3 flex flex-col items-center gap-5" dir="ltr">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90",
            liked ? "bg-red-500" : "bg-black/40 backdrop-blur-sm border border-white/10"
          )}>
            <Heart className={cn("w-5 h-5", liked ? "fill-white text-white" : "text-white")} />
          </div>
          <span className="text-white text-xs font-bold">{localLikes}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg active:scale-90">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-bold">مشاركة</span>
        </button>

        <button onClick={handleDownload} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg active:scale-90">
            <Download className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-bold">تحميل</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const { user } = useAuthStore();
  const [allReels, setAllReels] = useState<Reel[]>(() => mergeWithDemos(loadAll()));
  const [activeIndex, setActiveIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Only show approved reels in feed, sorted smart
  const feed = sortReels(allReels.filter(r => r.status === "approved"));
  const pendingCount = allReels.filter(r => r.status === "pending").length;

  // Preload next video element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const videos = container.querySelectorAll("video");
    videos.forEach((v, i) => {
      if (videos[i + 1]) videos[i + 1].setAttribute("preload", "auto");
    });
  }, [feed.length]);

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll("[data-reel-index]");
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveIndex(Number((entry.target as HTMLElement).dataset.reelIndex ?? 0));
        }
      });
    }, { threshold: 0.7, root: container });
    cards.forEach(card => observerRef.current?.observe(card));
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [feed.length, setupObserver]);

  const scrollTo = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.clientHeight * idx, behavior: "smooth" });
  };

  const handleSubmit = (reel: Reel) => {
    const next = [reel, ...allReels];
    setAllReels(next);
    saveAll(next);
    if (reel.status === "approved") setTimeout(() => scrollTo(0), 100);
  };

  const handleLike = (id: number) => {
    setAllReels(prev => {
      const next = prev.map(r => r.id === id ? { ...r, likes: r.likes + 1 } : r);
      saveAll(next);
      return next;
    });
  };

  const handleView = (id: number) => {
    setAllReels(prev => {
      const next = prev.map(r => r.id === id ? { ...r, views: r.views + 1 } : r);
      saveAll(next);
      return next;
    });
  };

  const handleApprove = (id: number) => {
    setAllReels(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: "approved" as ReelStatus } : r);
      saveAll(next);
      return next;
    });
  };

  const handleReject = (id: number) => {
    setAllReels(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: "rejected" as ReelStatus } : r);
      saveAll(next);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-10 flex flex-col">
      {/* Upload button */}
      <button
        onClick={() => setShowUpload(true)}
        className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-white/25 active:scale-95 transition-all"
      >
        <Upload className="w-4 h-4" /> رفع فيديو
      </button>

      {/* Admin approval button */}
      {user?.role === "admin" && (
        <button
          onClick={() => setShowAdmin(true)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-emerald-500/30 active:scale-95 transition-all"
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

      {/* Navigation arrows */}
      {activeIndex > 0 && (
        <button onClick={() => scrollTo(activeIndex - 1)} className="absolute top-16 right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white">
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {activeIndex < feed.length - 1 && (
        <button onClick={() => scrollTo(activeIndex + 1)} className="absolute bottom-20 right-4 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white">
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {feed.map((_, i) => (
          <button key={i} onClick={() => scrollTo(i)} className={cn(
            "rounded-full transition-all",
            i === activeIndex ? "bg-white w-4 h-2" : "bg-white/30 w-2 h-2"
          )} />
        ))}
      </div>

      {/* Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {feed.map((reel, i) => (
          <div
            key={reel.id}
            data-reel-index={i}
            className="w-full snap-center"
            style={{ height: "100dvh", minHeight: "100dvh" }}
          >
            <ReelCard
              reel={reel}
              isActive={i === activeIndex}
              onLike={handleLike}
              onView={handleView}
            />
          </div>
        ))}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubmit={handleSubmit} />}
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
