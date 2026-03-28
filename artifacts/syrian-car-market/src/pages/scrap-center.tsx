// UI_ID: SCRAP_CENTER_DETAIL_01
// NAME: تفاصيل مركز الخردة
import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { withApi } from "@/lib/runtimeConfig";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { useToast } from "@/hooks/use-toast";
import { ShareSheet } from "@/components/ShareSheet";
import {
  Loader2, MapPin, Phone, MessageCircle, Star, ShieldCheck,
  Recycle, ChevronRight, PenLine, Camera, Settings2, Save, X, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StarRow({ rating, interactive, onRate }: { rating: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            "w-4 h-4 transition-colors",
            (hovered || rating) >= i ? "fill-amber-400 text-amber-400" : "text-gray-300",
            interactive && "cursor-pointer hover:scale-110 transition-transform"
          )}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
      <span className="text-xs text-muted-foreground mr-1">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

function ImageUploadBtn({ onUploaded, className, children }: {
  onUploaded: (url: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(withApi("/api/scrap-centers/upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("scm_token")}` },
        body: fd,
      });
      const data = await res.json();
      if (data.url) onUploaded(data.url);
      else toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } catch { toast({ title: "فشل رفع الصورة", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} className={className} disabled={uploading}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : children}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </>
  );
}

function EditModal({ center, onClose, onSaved }: { center: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const waRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const typesRef = useRef<HTMLTextAreaElement>(null);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (nameRef.current?.value) body.name = nameRef.current.value;
      if (phoneRef.current?.value !== undefined) body.phone = phoneRef.current.value;
      if (waRef.current?.value !== undefined) body.whatsapp = waRef.current.value;
      if (cityRef.current?.value) body.city = cityRef.current.value;
      if (addressRef.current?.value !== undefined) body.address = addressRef.current.value;
      if (descRef.current?.value !== undefined) body.description = descRef.current.value;
      if (typesRef.current?.value !== undefined) body.acceptedTypes = typesRef.current.value;
      await apiRequest("/api/scrap-centers/my", "PATCH", body);
      toast({ title: "✅ تم حفظ بيانات المركز" });
      onSaved();
      onClose();
    } catch { toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">تعديل بيانات المركز</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">اسم المركز</label>
            <input ref={nameRef} defaultValue={center.name} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">هاتف</label>
              <input ref={phoneRef} type="tel" defaultValue={center.phone ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30" dir="ltr" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">واتساب</label>
              <input ref={waRef} type="tel" defaultValue={center.whatsapp ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30" dir="ltr" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">المدينة</label>
              <input ref={cityRef} defaultValue={center.city ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">العنوان</label>
              <input ref={addressRef} defaultValue={center.address ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">ما نقبله (افصل بفاصلة)</label>
            <textarea ref={typesRef} defaultValue={center.acceptedTypes ?? ""} rows={2} placeholder="سيارات تالفة، قطع غيار، سيارات حوادث، محركات" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">نبذة عن المركز</label>
            <textarea ref={descRef} defaultValue={center.description ?? ""} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none" /></div>
        </div>
        <button onClick={save} disabled={saving} className="mt-5 w-full flex items-center justify-center gap-2 bg-orange-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ التعديلات
        </button>
      </div>
    </div>
  );
}

export default function ScrapCenterPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { startChat, loading: chatLoading } = useStartChat();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [localRating, setLocalRating] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: center, isLoading } = useQuery<any>({
    queryKey: ["/scrap-centers", id],
    queryFn: () => fetch(withApi(`/api/scrap-centers/${id}`)).then(r => r.json()),
    enabled: !isNaN(id),
  });

  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-orange-600" /></div>;
  if (!center || center.error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
      <Recycle className="w-16 h-16 text-muted-foreground/40" />
      <p className="text-xl font-bold text-muted-foreground">المركز غير موجود</p>
      <button onClick={() => navigate("/")} className="px-6 py-2 rounded-xl bg-orange-600 text-white font-bold text-sm">العودة للرئيسية</button>
    </div>
  );

  const rating = localRating ?? Number(center.rating ?? 0);
  const isOwner = user && center.ownerUserId && user.id === center.ownerUserId;
  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
  const acceptedTypes = center.acceptedTypes ? center.acceptedTypes.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  const handleImageUpload = async (field: "logo" | "coverImage", url: string) => {
    try {
      await apiRequest("/api/scrap-centers/my", "PATCH", { [field]: url });
      qc.invalidateQueries({ queryKey: ["/scrap-centers", id] });
    } catch { toast({ title: "فشل حفظ الصورة", variant: "destructive" }); }
  };

  const handleRate = async (score: number) => {
    if (!user) { navigate("/login"); return; }
    try {
      const res = await fetch(withApi(`/api/scrap-centers/${id}/rate`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("scm_token")}` },
        body: JSON.stringify({ rating: score }),
      });
      const data = await res.json();
      setLocalRating(data.rating ?? score);
      toast({ title: "✅ تم تسجيل تقييمك!" });
    } catch { setLocalRating(score); }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {editOpen && isOwner && (
        <EditModal center={center} onClose={() => setEditOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["/scrap-centers", id] })} />
      )}

      {/* Cover */}
      <div className="relative w-full h-52 bg-gradient-to-br from-orange-700 via-orange-600 to-amber-500 overflow-hidden">
        {center.coverImage && <img src={withApi(center.coverImage)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30">
            <ChevronRight className="w-5 h-5" />
          </button>
          {isOwner && (
            <ImageUploadBtn onUploaded={url => handleImageUpload("coverImage", url)}
              className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Camera className="w-3.5 h-3.5" /> تغيير الغلاف
            </ImageUploadBtn>
          )}
        </div>

        <div className="absolute top-4 left-4 flex gap-2">
          {center.isVerified && <span className="flex items-center gap-1 bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"><ShieldCheck className="w-3 h-3" /> موثّق</span>}
          {center.isFeatured && <span className="flex items-center gap-1 bg-orange-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"><Star className="w-3 h-3 fill-white" /> مميّز</span>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-14 mb-5">
          <div className="bg-card border rounded-2xl shadow-lg p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative flex-shrink-0 w-20 h-20">
                <div className="w-20 h-20 rounded-xl border-2 border-border bg-muted shadow-sm overflow-hidden">
                  {center.logo
                    ? <img src={withApi(center.logo)} alt={center.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-orange-500/10 flex items-center justify-center"><Recycle className="w-9 h-9 text-orange-500/60" /></div>
                  }
                </div>
                {isOwner && (
                  <ImageUploadBtn onUploaded={url => handleImageUpload("logo", url)}
                    className="absolute -bottom-1.5 -left-1.5 w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center shadow-md hover:bg-orange-700 border-2 border-background">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </ImageUploadBtn>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-xl font-bold text-foreground leading-tight">{center.name}</h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ShareSheet
                    options={{ title: center.name, city: center.city, url: `${baseUrl}/scrap-center/${id}`, description: center.description }}
                    className="flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  />
                  {isOwner && (
                    <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 border border-orange-200 rounded-full px-2.5 py-1 text-xs font-bold">
                      <PenLine className="w-3 h-3" /> تعديل
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{center.city}{center.address ? ` — ${center.address}` : ""}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StarRow rating={rating} interactive={!!user} onRate={handleRate} />
                  <span className="text-xs text-muted-foreground">{user ? "(اضغط للتقييم)" : "سجّل الدخول للتقييم"}</span>
                </div>
              </div>
            </div>

            {/* Accepted Types */}
            {acceptedTypes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">ما نقبله</h3>
                <div className="flex flex-wrap gap-2">
                  {acceptedTypes.map((t: string, i: number) => (
                    <span key={i} className="flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 text-sm font-medium">
                      <Wrench className="w-3.5 h-3.5" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {center.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 border-t pt-4">{center.description}</p>
            )}

            {/* Contact */}
            <div className="flex flex-col gap-2">
              {(center.phone || center.whatsapp) && (
                <div className="grid grid-cols-2 gap-2">
                  {center.phone && (
                    <a href={`tel:${center.phone}`} className="flex items-center justify-center gap-2 bg-muted/60 hover:bg-muted border rounded-xl py-2.5 font-bold text-sm">
                      <Phone className="w-4 h-4 text-orange-600" /> اتصال
                    </a>
                  )}
                  {center.whatsapp && (
                    <a href={`https://wa.me/${center.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-bold text-sm">
                      <MessageCircle className="w-4 h-4" /> واتساب
                    </a>
                  )}
                </div>
              )}
              {center.ownerUserId && user?.id !== center.ownerUserId && (
                <button
                  disabled={chatLoading || !user}
                  onClick={() => { if (!user) { navigate("/login"); return; } startChat(center.ownerUserId, undefined, undefined); }}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 border border-orange-200 rounded-xl py-2.5 font-bold text-sm disabled:opacity-50"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageCircle className="w-4 h-4" /> مراسلة المركز</>}
                </button>
              )}
              {isOwner && (
                <button onClick={() => navigate("/scrap-center/manage")}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white rounded-xl py-2.5 font-bold text-sm hover:bg-orange-700 active:scale-[0.98]">
                  <Settings2 className="w-4 h-4" /> إدارة مركزي
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
