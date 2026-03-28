// UI_ID: REELS_UPLOAD_01
// NAME: رفع فيديو
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Camera, ImagePlay, X, ChevronRight, Loader2,
  Clock, Building2, CheckCircle2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Showroom { id: number; name: string; city?: string; }

const CITIES = ["دمشق", "حلب", "حمص", "حماه", "اللاذقية", "طرطوس", "دير الزور", "الرقة", "السويداء", "درعا", "إدلب", "القامشلي"];

// ─── Thumbnail generator ────────────────────────────────────────────────────────

function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url; video.currentTime = 1; video.muted = true; video.playsInline = true;
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadeddata = () => {
      try {
        const c = document.createElement("canvas");
        c.width = video.videoWidth || 640; c.height = video.videoHeight || 640;
        c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
        c.toBlob(blob => { cleanup(); resolve(blob); }, "image/jpeg", 0.8);
      } catch { cleanup(); resolve(null); }
    };
    video.onerror = () => { cleanup(); resolve(null); };
    video.load();
  });
}

// ─── Step 1: Picker ─────────────────────────────────────────────────────────────

function FilePicker({ onFile }: { onFile: (f: File) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-safe">
      <div className="text-center mb-2">
        <h1 className="text-white text-2xl font-bold">رفع فيديو</h1>
        <p className="text-white/40 text-sm mt-1">اختر طريقة إضافة الفيديو</p>
      </div>

      <button
        onClick={() => cameraRef.current?.click()}
        className="w-full max-w-xs flex flex-col items-center justify-center gap-4 bg-white/10 border-2 border-white/20 rounded-3xl py-10 active:scale-95 transition-transform hover:bg-white/15"
      >
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Camera className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">تصوير فيديو</p>
          <p className="text-white/50 text-sm">سجّل مقطعاً مباشرة بالكاميرا</p>
        </div>
      </button>

      <button
        onClick={() => galleryRef.current?.click()}
        className="w-full max-w-xs flex flex-col items-center justify-center gap-4 bg-white/10 border-2 border-white/20 rounded-3xl py-10 active:scale-95 transition-transform hover:bg-white/15"
      >
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <ImagePlay className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">من الاستديو</p>
          <p className="text-white/50 text-sm">اختر فيديو من مكتبة الجهاز</p>
        </div>
      </button>

      <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <input ref={galleryRef} type="file" accept="video/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ─── Step 2: Form ───────────────────────────────────────────────────────────────

function UploadForm({ file, previewUrl, onDone }: {
  file: File; previewUrl: string;
  onDone: (status: string) => void;
}) {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [dealerId, setDealerId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [suggestions, setSuggestions] = useState<Showroom[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [showCities, setShowCities] = useState(false);

  useEffect(() => {
    apiRequest<Showroom[]>("/api/showrooms")
      .then(data => setShowrooms(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleDealerChange = (val: string) => {
    setDealerName(val);
    setDealerId(null);
    if (val.length >= 1) {
      const q = val.toLowerCase();
      const matches = showrooms.filter(s =>
        s.name.toLowerCase().includes(q) || (s.city || "").toLowerCase().includes(q)
      );
      setSuggestions(matches.slice(0, 5));
      setShowSugg(matches.length > 0);
    } else {
      setShowSugg(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) { toast({ title: "أضف عنواناً للفيديو", variant: "destructive" }); return; }
    setSubmitting(true);
    setProgress(10);
    try {
      // 1. Upload video
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title.trim());
      if (desc.trim()) formData.append("desc", desc.trim());
      if (price.trim()) formData.append("price", price.trim());
      if (city) formData.append("city", city);
      if (dealerName.trim()) formData.append("dealerName", dealerName.trim());
      if (dealerId) formData.append("dealerId", String(dealerId));

      const xhr = new XMLHttpRequest();
      const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      xhr.open("POST", `${apiBase}/api/reels/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 80));
      };

      const result = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error("فشل معالجة الاستجابة")); }
        };
        xhr.onerror = () => reject(new Error("خطأ في الشبكة"));
        xhr.send(formData);
      });

      if (xhr.status !== 200 || result.error) {
        throw new Error(result.error || `خطأ ${xhr.status}`);
      }

      setProgress(85);

      // 2. Upload thumbnail
      try {
        const thumbBlob = await generateThumbnail(file);
        if (thumbBlob && result.id) {
          const thumbForm = new FormData();
          thumbForm.append("thumbnail", thumbBlob, "thumb.jpg");
          await fetch(`${apiBase}/api/reels/${result.id}/thumbnail`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: thumbForm,
          });
        }
      } catch { /* thumbnail is optional */ }

      setProgress(100);
      onDone(result.status);
    } catch (e: any) {
      toast({ title: e.message || "فشل رفع الفيديو", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
      <div className="px-5 py-4 space-y-4">

        {user?.role !== "admin" && (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2.5">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-xs">سيخضع الفيديو للمراجعة قبل النشر</p>
          </div>
        )}

        {/* Video preview */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
          <video src={previewUrl} className="w-full aspect-square object-cover bg-black" controls playsInline />
        </div>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="عنوان الإعلان"
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />

        {/* Dealer name with suggestions */}
        <div className="relative">
          <div className="flex items-center bg-white/10 border border-white/10 rounded-xl px-4 py-3 gap-2 focus-within:ring-2 focus-within:ring-white/20">
            <Building2 className="w-4 h-4 text-white/40 flex-shrink-0" />
            <input
              value={dealerName} onChange={e => handleDealerChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSugg(true); }}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="اسم المعرض"
              className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
            />
          </div>
          {showSugg && suggestions.length > 0 && (
            <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              {suggestions.map(s => (
                <button key={s.id}
                  onMouseDown={() => {
                    setDealerName(s.name);
                    setDealerId(s.id);
                    if (s.city) setCity(s.city);
                    setShowSugg(false);
                  }}
                  className="w-full text-right px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center justify-between border-b border-white/5 last:border-0">
                  <span className="text-white/40 text-xs">{s.city || ""}</span>
                  <span className="font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <textarea value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="وصف الإعلان" rows={3}
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none" />

        {/* Price + City */}
        <div className="grid grid-cols-2 gap-3">
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر $"
            className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" />

          <div className="relative">
            <button onClick={() => setShowCities(v => !v)}
              className="w-full flex items-center justify-between bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20">
              <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform", showCities && "rotate-180")} />
              <span className={cn("flex-1 text-right", city ? "text-white" : "text-white/40")}>{city || "المدينة"}</span>
            </button>
            {showCities && (
              <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-44 overflow-y-auto">
                {CITIES.map(c => (
                  <button key={c} onMouseDown={() => { setCity(c); setShowCities(false); }}
                    className={cn("w-full text-right px-4 py-2.5 text-sm hover:bg-white/10 border-b border-white/5 last:border-0",
                      city === c ? "text-amber-400 font-bold" : "text-white")}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload progress */}
        {submitting && progress > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/60">
              <span>{progress < 85 ? "جاري رفع الفيديو..." : progress < 100 ? "جاري معالجة الصورة..." : "تم بنجاح!"}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Submit */}
        <button onClick={submit} disabled={submitting || !title.trim()}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl py-3.5 text-sm hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50">
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الرفع...</>
            : <><CheckCircle2 className="w-4 h-4" /> {user?.role === "admin" ? "نشر الآن" : "إرسال للمراجعة"}</>
          }
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function ReelsUploadPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canUpload = user?.role === "admin" || user?.role === "dealer";

  const handleFile = (f: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleDone = (status: string) => {
    toast({ title: status === "approved" ? "✅ تم نشر الفيديو" : "📋 تم إرساله للمراجعة" });
    navigate("/reels");
  };

  if (!canUpload) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-8 text-center" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-5">
          <Camera className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">ميزة حصرية للمعارض</h2>
        <p className="text-white/60 text-sm leading-relaxed mb-8">رفع الفيديوهات متاح للمعارض المشتركة والإدارة فقط</p>
        <button onClick={() => navigate("/reels")} className="w-full max-w-xs bg-white text-black font-bold rounded-2xl py-4">العودة للريلز</button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-[#0a0a0a] flex flex-col text-right"
      dir="rtl"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0" style={{ minHeight: 56 }}>
        <button onClick={() => navigate("/reels")}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">{file ? "تفاصيل الإعلان" : "رفع فيديو جديد"}</h1>
        {file && (
          <button
            onClick={() => { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Content */}
      {file && previewUrl
        ? <UploadForm file={file} previewUrl={previewUrl} onDone={handleDone} />
        : <FilePicker onFile={handleFile} />
      }
    </div>
  );
}
