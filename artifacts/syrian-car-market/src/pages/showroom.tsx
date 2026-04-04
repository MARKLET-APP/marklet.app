// UI_ID: SHOWROOM_DETAIL_01
// NAME: تفاصيل المعرض
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { ShareSheet } from "@/components/ShareSheet";
import { CarCard } from "@/components/CarCard";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, MapPin, Phone, MessageCircle, Car, Star, ShieldCheck,
  Building2, ChevronRight, PenLine, Save, X, Camera, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Star Rating Row ────────────────────────────────────────────────────────────
function StarRow({
  rating, interactive = false, onRate,
}: {
  rating: number; interactive?: boolean; onRate?: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            "w-4 h-4 transition-all",
            (hovered || rating) >= i ? "fill-amber-400 text-amber-400" : "text-gray-200",
            interactive && "cursor-pointer hover:scale-110"
          )}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
      {rating > 0 && <span className="text-xs text-muted-foreground mr-1.5">{Number(rating).toFixed(1)}</span>}
    </div>
  );
}

// ── Image Upload Button ────────────────────────────────────────────────────────
function ImageUploadBtn({
  onUploaded, className, children,
}: {
  onUploaded: (url: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("scm_token");
      const res = await fetch(withApi("/api/showrooms/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      onUploaded(data.url);
      toast({ title: "✅ تم رفع الصورة" });
    } catch (err: any) {
      toast({ title: err.message ?? "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={className}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
      </button>
    </>
  );
}

// ── Edit Modal (owner only) ────────────────────────────────────────────────────
function EditShowroomModal({
  showroom, onClose, onSaved,
}: { showroom: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (nameRef.current?.value) body.name = nameRef.current.value;
      if (phoneRef.current?.value !== undefined) body.phone = phoneRef.current.value;
      if (whatsappRef.current?.value !== undefined) body.whatsapp = whatsappRef.current.value;
      if (cityRef.current?.value) body.city = cityRef.current.value;
      if (addressRef.current?.value !== undefined) body.address = addressRef.current.value;
      if (descRef.current?.value !== undefined) body.description = descRef.current.value;
      await apiRequest("/api/showrooms/my", "PATCH", body);
      toast({ title: "✅ تم حفظ بيانات المعرض" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">تعديل بيانات المعرض</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">اسم المعرض</label>
            <input ref={nameRef} type="text" defaultValue={showroom.name ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">رقم الهاتف</label>
              <input ref={phoneRef} type="tel" defaultValue={showroom.phone ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" placeholder="+963..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">واتساب</label>
              <input ref={whatsappRef} type="tel" defaultValue={showroom.whatsapp ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" placeholder="+963..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المدينة</label>
              <input ref={cityRef} type="text" defaultValue={showroom.city ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">العنوان</label>
              <input ref={addressRef} type="text" defaultValue={showroom.address ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">نبذة عن المعرض</label>
            <textarea ref={descRef} defaultValue={showroom.description ?? ""} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="mt-5 w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 font-bold text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التعديلات
        </button>
      </div>
    </div>
  );
}

// ── Main Showroom Page ─────────────────────────────────────────────────────────
export default function ShowroomPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { startChat, loading: chatLoading } = useStartChat();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [localRating, setLocalRating] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: showroom, isLoading } = useQuery<any>({
    queryKey: ["/showrooms", id],
    queryFn: () => fetch(withApi(`/api/showrooms/${id}`)).then(r => r.json()),
    enabled: !isNaN(id),
  });

  const { data: cars = [], isLoading: loadingCars } = useQuery<any[]>({
    queryKey: ["/showrooms", id, "cars"],
    queryFn: () => fetch(withApi(`/api/showrooms/${id}/cars`)).then(r => r.json()),
    enabled: !isNaN(id),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!showroom || showroom.error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
      <Building2 className="w-16 h-16 text-muted-foreground/40" />
      <p className="text-xl font-bold text-muted-foreground">المعرض غير موجود</p>
      <button onClick={() => navigate("/")} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm">العودة للرئيسية</button>
    </div>
  );

  const rating = localRating ?? Number(showroom.rating ?? 0);
  const isOwner = user && showroom.ownerUserId && user.id === showroom.ownerUserId;
  const carsCount = Array.isArray(cars) ? cars.length : 0;
  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");

  // Upload image and immediately save to showroom
  const handleImageUpload = async (field: "logo" | "coverImage", url: string) => {
    try {
      await apiRequest("/api/showrooms/my", "PATCH", { [field]: url });
      qc.invalidateQueries({ queryKey: ["/showrooms", id] });
    } catch {
      toast({ title: "فشل حفظ الصورة", variant: "destructive" });
    }
  };

  // Flexible rating — users can change their rating anytime
  const handleRate = async (score: number) => {
    if (!user) { navigate("/login"); return; }
    try {
      const res = await fetch(withApi(`/api/showrooms/${id}/rate`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("scm_token")}` },
        body: JSON.stringify({ rating: score }),
      });
      const data = await res.json();
      setLocalRating(data.rating ?? score);
      toast({ title: "✅ تم تسجيل تقييمك!" });
    } catch {
      setLocalRating(score);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {editOpen && isOwner && (
        <EditShowroomModal
          showroom={showroom}
          onClose={() => setEditOpen(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["/showrooms", id] })}
        />
      )}

      {/* ── Cover ── */}
      <div className="relative w-full h-52 bg-gradient-to-br from-primary via-primary/80 to-emerald-700 overflow-hidden">
        {showroom.coverImage && (
          <img src={withApi(showroom.coverImage)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top-right: back + cover upload stacked */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {isOwner && (
            <ImageUploadBtn
              onUploaded={url => handleImageUpload("coverImage", url)}
              className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              تغيير الغلاف
            </ImageUploadBtn>
          )}
        </div>

        {/* Badges top-left */}
        <div className="absolute top-4 left-4 flex gap-2">
          {showroom.isVerified && (
            <span className="flex items-center gap-1 bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <ShieldCheck className="w-3 h-3" /> موثّق
            </span>
          )}
          {showroom.isFeatured && (
            <span className="flex items-center gap-1 bg-amber-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <Star className="w-3 h-3 fill-white" /> مميّز
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* ── Profile card ── */}
        <div className="relative -mt-14 mb-5">
          <div className="bg-card border rounded-2xl shadow-lg p-5">
            {/* Logo + name + actions row */}
            <div className="flex items-start gap-4 mb-4">

              {/* Logo with upload button (owner only) */}
              <div className="relative flex-shrink-0 w-20 h-20">
                <div className="w-20 h-20 rounded-xl border-2 border-border bg-muted shadow-sm overflow-hidden">
                  {showroom.logo
                    ? <img src={withApi(showroom.logo)} alt={showroom.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Building2 className="w-9 h-9 text-primary/60" /></div>
                  }
                </div>
                {isOwner && (
                  <ImageUploadBtn
                    onUploaded={url => handleImageUpload("logo", url)}
                    className="absolute -bottom-1.5 -left-1.5 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors border-2 border-background"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </ImageUploadBtn>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                {/* Name — full width */}
                <h1 className="text-xl font-bold text-foreground leading-tight">{showroom.name}</h1>

                {/* Share + Edit row below name */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ShareSheet
                    options={{ title: showroom.name, city: showroom.city, url: `${baseUrl}/showroom/${id}`, description: showroom.description }}
                    className="flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  />
                  {isOwner && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-2.5 py-1 text-xs font-bold transition-colors"
                    >
                      <PenLine className="w-3 h-3" /> تعديل
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{showroom.city}{showroom.address ? ` — ${showroom.address}` : ""}</span>
                </div>
                {/* Rating row — always interactive for logged-in users */}
                <div className="flex items-center gap-2 mt-2">
                  <StarRow rating={rating} interactive={!!user} onRate={handleRate} />
                  {user
                    ? <span className="text-xs text-muted-foreground">(اضغط للتقييم)</span>
                    : <span className="text-xs text-muted-foreground">سجّل الدخول للتقييم</span>
                  }
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{loadingCars ? "…" : carsCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">سيارة معروضة</p>
              </div>
              <div className="bg-muted/50 border rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{showroom.city || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">المدينة</p>
              </div>
            </div>

            {/* Description */}
            {showroom.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 border-t pt-4">{showroom.description}</p>
            )}

            {/* Contact buttons */}
            <div className="flex flex-col gap-2">
              {(showroom.phone || showroom.whatsapp) && (
                <div className="grid grid-cols-2 gap-2">
                  {showroom.phone && (
                    <a href={`tel:${showroom.phone}`} className="flex items-center justify-center gap-2 bg-muted/60 hover:bg-muted border rounded-xl py-2.5 font-bold text-sm transition-colors">
                      <Phone className="w-4 h-4 text-primary" /> اتصال
                    </a>
                  )}
                  {showroom.whatsapp && (
                    <a href={`https://wa.me/${showroom.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-bold text-sm transition-colors">
                      <MessageCircle className="w-4 h-4" /> واتساب
                    </a>
                  )}
                </div>
              )}
              {showroom.ownerUserId && user?.id !== showroom.ownerUserId && (
                <button
                  disabled={chatLoading || !user}
                  onClick={() => { if (!user) { navigate("/login"); return; } startChat(showroom.ownerUserId, undefined, undefined); }}
                  className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl py-2.5 font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageCircle className="w-4 h-4" /> مراسلة المعرض</>}
                </button>
              )}
              {/* Owner: quick link to manage page */}
              {isOwner && (
                <button
                  onClick={() => navigate("/showroom/manage")}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-2.5 font-bold text-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Settings2 className="w-4 h-4" /> إدارة معرضي
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Cars Grid ── */}
        <div className="pb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" /> سيارات المعرض
            </h2>
            {!loadingCars && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{carsCount}</span>
            )}
          </div>

          {loadingCars ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : carsCount === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed">
              <Car className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-bold text-muted-foreground">لا توجد سيارات منشورة بعد</p>
              <p className="text-sm text-muted-foreground/70 mt-1">سيتم عرض سيارات هذا المعرض هنا</p>
            </div>
          ) : (
            <div className="ads-grid grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(cars as any[]).map((car: any) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
