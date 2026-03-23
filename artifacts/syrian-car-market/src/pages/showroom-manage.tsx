import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, PenLine, Trash2, Plus, CheckCircle2, Clock, XCircle, Car, ChevronLeft, Save, ImagePlus, Phone, MapPin, AlignLeft, ShieldCheck, Star, AlertCircle, ExternalLink } from "lucide-react";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
      <CheckCircle2 className="w-3 h-3" /> مقبول
    </span>
  );
  if (status === "pending") return (
    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
      <Clock className="w-3 h-3" /> قيد المراجعة
    </span>
  );
  if (status === "rejected") return (
    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
      <XCircle className="w-3 h-3" /> مرفوض
    </span>
  );
  return <span className="text-xs text-muted-foreground">{status}</span>;
}

// ─── Edit Car Modal ───────────────────────────────────────────────────────────
function EditCarModal({ car, showroom, onClose, onSaved }: {
  car: any; showroom: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const priceRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const mileageRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const autoApprove = showroom?.isFeatured || showroom?.isVerified;

  const save = async () => {
    setSaving(true);
    try {
      const price = parseFloat(priceRef.current?.value ?? "0");
      const body: Record<string, unknown> = {};
      if (!isNaN(price) && price > 0) body.price = price;
      if (descRef.current?.value) body.description = descRef.current.value;
      if (colorRef.current?.value) body.color = colorRef.current.value;
      const mi = parseInt(mileageRef.current?.value ?? "0");
      if (!isNaN(mi) && mi >= 0) body.mileage = mi;

      await apiRequest(`/api/showrooms/my/cars/${car.id}`, "PATCH", body);
      toast({ title: autoApprove ? "✅ تم التعديل ونُشر فوراً" : "✅ تم التعديل وسيُراجع من الأدمن" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">تعديل الإعلان</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
        </div>

        <div className="text-sm font-medium text-muted-foreground mb-4 bg-muted/40 rounded-xl p-3">
          {car.brand} {car.model} — {car.year}
        </div>

        {!autoApprove && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            التعديلات ستنتظر موافقة الأدمن قبل النشر. المعارض الموثقة أو المميزة تُنشر فوراً.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">السعر (USD)</label>
            <input ref={priceRef} type="number" defaultValue={car.price} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الكيلومترات</label>
            <input ref={mileageRef} type="number" defaultValue={car.mileage} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">اللون</label>
            <input ref={colorRef} type="text" defaultValue={car.color ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="أبيض، أسود..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الوصف</label>
            <textarea ref={descRef} defaultValue={car.description ?? ""} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="اكتب تفاصيل إضافية..." />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShowroomManagePage() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"profile" | "cars">("cars");
  const [editingCar, setEditingCar] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Refs for profile form
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const isDealer = !!user && (user.role === "dealer" || user.role === "admin");

  // ── ALL hooks before any conditional returns ────────────────────────────────
  const { data: showroom, isLoading: loadingShowroom } = useQuery<any>({
    queryKey: ["/showrooms/my"],
    queryFn: () => fetch(withApi("/api/showrooms/my"), {
      headers: { Authorization: `Bearer ${localStorage.getItem("scm_token")}` }
    }).then(r => r.json()),
    enabled: isDealer,
  });

  const { data: cars = [], isLoading: loadingCars, refetch: refetchCars } = useQuery<any[]>({
    queryKey: ["/showrooms/my/cars"],
    queryFn: () => fetch(withApi("/api/showrooms/my/cars"), {
      headers: { Authorization: `Bearer ${localStorage.getItem("scm_token")}` }
    }).then(r => r.json()),
    enabled: isDealer && !!showroom && !showroom?.error,
  });

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const body: Record<string, string> = {};
      if (nameRef.current?.value) body.name = nameRef.current.value;
      if (phoneRef.current?.value !== undefined) body.phone = phoneRef.current.value;
      if (whatsappRef.current?.value !== undefined) body.whatsapp = whatsappRef.current.value;
      if (cityRef.current?.value) body.city = cityRef.current.value;
      if (addressRef.current?.value !== undefined) body.address = addressRef.current.value;
      if (descRef.current?.value !== undefined) body.description = descRef.current.value;
      if (logoRef.current?.value !== undefined) body.logo = logoRef.current.value;
      await apiRequest("/api/showrooms/my", "PATCH", body);
      qc.invalidateQueries({ queryKey: ["/showrooms/my"] });
      toast({ title: "✅ تم حفظ بيانات المعرض" });
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally { setSavingProfile(false); }
  };

  const deleteCar = async (id: number) => {
    setDeletingId(id);
    try {
      await apiRequest(`/api/showrooms/my/cars/${id}`, "DELETE");
      toast({ title: "تم حذف الإعلان" });
      refetchCars();
    } catch {
      toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
    } finally { setDeletingId(null); }
  };

  // Navigate to public showroom page
  const openPublicPage = () => navigate(`/showroom/${showroom?.id}`);

  // ── Guards (after hooks) ────────────────────────────────────────────────────
  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
  if (!isDealer) {
    navigate("/");
    return null;
  }
  if (loadingShowroom) return (
    <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
  );
  if (!showroom || showroom?.error === "no_showroom") return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center" dir="rtl">
      <Building2 className="w-16 h-16 text-muted-foreground/40" />
      <h2 className="text-xl font-bold">لا يوجد معرض مرتبط بحسابك</h2>
      <p className="text-sm text-muted-foreground">تواصل مع الإدارة لربط معرضك بحسابك.</p>
      <button onClick={() => navigate("/")} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm">العودة للرئيسية</button>
    </div>
  );

  const autoApprove = showroom.isFeatured || showroom.isVerified;
  const approvedCount = (cars as any[]).filter(c => c.status === "approved").length;
  const pendingCount = (cars as any[]).filter(c => c.status === "pending").length;

  return (
    <div className="min-h-screen pb-24 bg-background" dir="rtl">
      {editingCar && (
        <EditCarModal
          car={editingCar}
          showroom={showroom}
          onClose={() => setEditingCar(null)}
          onSaved={() => refetchCars()}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-base leading-tight">{showroom.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {showroom.isVerified && <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium"><ShieldCheck className="w-3 h-3" /> موثّق</span>}
              {showroom.isFeatured && <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium"><Star className="w-3 h-3 fill-amber-500" /> مميّز</span>}
              {autoApprove && <span className="text-xs text-primary font-medium">• نشر تلقائي</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openPublicPage}
              className="flex items-center gap-1 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> عرض المعرض
            </button>
            <button onClick={() => navigate("/add-listing")} className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">
              <Plus className="w-4 h-4" /> إعلان جديد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{(cars as any[]).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">إجمالي الإعلانات</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{approvedCount}</p>
            <p className="text-xs text-green-600 mt-0.5">منشور</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600 mt-0.5">قيد المراجعة</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted/50 rounded-xl p-1 mb-5">
          <button onClick={() => setTab("cars")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "cars" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
            إعلاناتي ({(cars as any[]).length})
          </button>
          <button onClick={() => setTab("profile")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "profile" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
            بيانات المعرض
          </button>
        </div>

        {/* ── Cars Tab ── */}
        {tab === "cars" && (
          <div>
            {!autoApprove && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                معرضك يحتاج موافقة الأدمن لكل إعلان. للنشر التلقائي، اطلب من الأدمن توثيق معرضك أو تمييزه.
              </div>
            )}

            {loadingCars ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (cars as any[]).length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed">
                <Car className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-bold text-muted-foreground">لا توجد إعلانات بعد</p>
                <button onClick={() => navigate("/add-listing")} className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm">
                  نشر أول إعلان
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(cars as any[]).map((car: any) => (
                  <div key={car.id} className="bg-card border rounded-2xl overflow-hidden flex gap-0">
                    {/* Image */}
                    <div className="w-28 h-24 flex-shrink-0 bg-muted">
                      {car.primaryImage
                        ? <img src={car.primaryImage} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Car className="w-8 h-8 text-muted-foreground/30" /></div>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{car.brand} {car.model} {car.year}</p>
                          <p className="text-primary font-bold text-sm mt-0.5">${Number(car.price).toLocaleString()}</p>
                        </div>
                        <StatusBadge status={car.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setEditingCar(car)}
                          className="flex items-center gap-1 text-xs bg-muted/60 hover:bg-muted border rounded-lg px-2.5 py-1.5 font-medium transition-colors"
                        >
                          <PenLine className="w-3.5 h-3.5" /> تعديل
                        </button>
                        <button
                          onClick={() => deleteCar(car.id)}
                          disabled={deletingId === car.id}
                          className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg px-2.5 py-1.5 font-medium transition-colors disabled:opacity-60"
                        >
                          {deletingId === car.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          حذف
                        </button>
                        <button
                          onClick={() => navigate(`/cars/${car.id}`)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 font-medium transition-colors"
                        >
                          عرض
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="bg-card border rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> بيانات المعرض</h3>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اسم المعرض</label>
                <input ref={nameRef} type="text" defaultValue={showroom.name ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="اسم المعرض" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> رقم الهاتف</label>
                  <input ref={phoneRef} type="tel" defaultValue={showroom.phone ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+963..." dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">واتساب</label>
                  <input ref={whatsappRef} type="tel" defaultValue={showroom.whatsapp ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+963..." dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> المدينة</label>
                  <input ref={cityRef} type="text" defaultValue={showroom.city ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="دمشق" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">العنوان</label>
                  <input ref={addressRef} type="text" defaultValue={showroom.address ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="شارع..." />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><AlignLeft className="w-3 h-3" /> نبذة عن المعرض</label>
                <textarea ref={descRef} defaultValue={showroom.description ?? ""} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="اكتب وصفاً مختصراً..." />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><ImagePlus className="w-3 h-3" /> رابط صورة اللوجو (URL)</label>
                <input ref={logoRef} type="url" defaultValue={showroom.logo ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://..." dir="ltr" />
              </div>

              {/* Current logo preview */}
              {showroom.logo && (
                <div className="flex items-center gap-3 pt-1">
                  <img src={showroom.logo} alt="logo" className="w-14 h-14 rounded-xl border object-cover" />
                  <span className="text-xs text-muted-foreground">الصورة الحالية</span>
                </div>
              )}
            </div>

            <button onClick={saveProfile} disabled={savingProfile} className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3.5 font-bold text-sm disabled:opacity-60">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ البيانات
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
