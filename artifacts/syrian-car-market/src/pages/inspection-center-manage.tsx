// UI_ID: INSPECTION_CENTER_MANAGE_01
// NAME: إدارة مركز الفحص
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ClipboardCheck, PenLine, ChevronLeft, Save,
  Phone, MapPin, AlignLeft, ShieldCheck, Star, ExternalLink, Settings2,
} from "lucide-react";

export default function InspectionCenterManagePage() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"profile">("profile");
  const [savingProfile, setSavingProfile] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const servicesRef = useRef<HTMLTextAreaElement>(null);

  const { data: center, isLoading } = useQuery<any>({
    queryKey: ["/inspection-centers/my"],
    queryFn: () => fetch(withApi("/api/inspection-centers/my"), {
      headers: { Authorization: `Bearer ${localStorage.getItem("scm_token")}` }
    }).then(r => r.json()),
    enabled: !!user,
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
      if (servicesRef.current?.value !== undefined) body.services = servicesRef.current.value;
      await apiRequest("/api/inspection-centers/my", "PATCH", body);
      qc.invalidateQueries({ queryKey: ["/inspection-centers/my"] });
      toast({ title: "✅ تم حفظ بيانات المركز" });
    } catch { toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" }); }
    finally { setSavingProfile(false); }
  };

  const openPublicPage = () => {
    if (center?.id) navigate(`/inspection-center/${center.id}`);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!user) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  if (!center || center?.error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center" dir="rtl">
      <ClipboardCheck className="w-16 h-16 text-muted-foreground/40" />
      <h2 className="text-xl font-bold">لا يوجد مركز فحص مرتبط بحسابك</h2>
      <p className="text-sm text-muted-foreground">تواصل مع الإدارة لربط مركزك بحسابك.</p>
      <button onClick={() => navigate("/")} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">العودة للرئيسية</button>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-base leading-tight">{center.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {center.isVerified && <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium"><ShieldCheck className="w-3 h-3" /> موثّق</span>}
              {center.isFeatured && <span className="flex items-center gap-0.5 text-xs text-blue-600 font-medium"><Star className="w-3 h-3 fill-blue-500" /> مميّز</span>}
            </div>
          </div>
          <button
            onClick={openPublicPage}
            className="flex items-center gap-1 border border-blue-600/30 text-blue-700 bg-blue-500/5 hover:bg-blue-500/10 px-3 py-2 rounded-xl text-sm font-bold"
          >
            <ExternalLink className="w-3.5 h-3.5" /> عرض المركز
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{Number(center.rating || 0).toFixed(1)}</p>
            <p className="text-xs text-blue-600 mt-0.5">التقييم</p>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{center.city || "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">المدينة</p>
          </div>
        </div>

        {/* Services Preview */}
        {center.services && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">خدمات مركزك</h3>
            <div className="flex flex-wrap gap-2">
              {center.services.split(",").map((s: string, i: number) => (
                <span key={i} className="text-xs bg-white text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">
                  {s.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-600" /> بيانات المركز
          </h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">اسم المركز</label>
            <input ref={nameRef} defaultValue={center.name ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> هاتف</label>
              <input ref={phoneRef} type="tel" defaultValue={center.phone ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">واتساب</label>
              <input ref={whatsappRef} type="tel" defaultValue={center.whatsapp ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> المدينة</label>
              <input ref={cityRef} defaultValue={center.city ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">العنوان</label>
              <input ref={addressRef} defaultValue={center.address ?? ""} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3" /> الخدمات المقدّمة (افصل بفاصلة)
            </label>
            <textarea ref={servicesRef} defaultValue={center.services ?? ""} rows={2}
              placeholder="فحص شامل، فحص بالكمبيوتر، فحص قبل الشراء، تقييم للبيع"
              className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><AlignLeft className="w-3 h-3" /> نبذة</label>
            <textarea ref={descRef} defaultValue={center.description ?? ""} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-60"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
