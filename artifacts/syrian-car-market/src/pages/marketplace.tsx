// UI_ID: MARKETPLACE_01 — كل شيء
import { useState, useRef, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, ShoppingBag, Loader2, Truck, X, ImagePlus, Package, Sparkles,
} from "lucide-react";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { withApi } from "@/lib/runtimeConfig";

const MARKETPLACE_CATEGORIES = [
  "أثاث ومنزل", "ملابس وأحذية", "إلكترونيات",
  "أدوات ومعدات", "كتب وتعليم", "مستلزمات أطفال",
  "فنون وتحف", "رياضة وترفيه", "أجهزة منزلية", "أخرى",
];
const CONDITIONS = ["ممتاز", "جيد جداً", "جيد", "مقبول"];

type MarketItem = {
  id: number; sellerId: number; title: string; price: string; currency: string;
  category: string; condition: string; images: string[] | null; province: string;
  city: string; shippingAvailable: boolean; isFeatured: boolean; viewCount: number;
  createdAt: string; sellerName: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  // استخدام withApi يضمن العنوان الصحيح على Android/Capacitor (https://marklet.net/api/...)
  const res = await fetch(withApi("/api/upload-image?folder=marketplace"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "upload failed");
  }
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(data.message || "upload failed");
  return data.url as string;
}

/** قراءة الصورة كـ base64 — يعمل في WebView و Capacitor Android */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * تحويل HEIC/HEIF → JPEG في المتصفح باستخدام heic2any
 * يحل مشكلة كاميرات Android/iOS التي تحفظ بتنسيق HEIC
 */
async function convertToJpeg(file: File): Promise<File> {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();

  // إذا كانت صورة مدعومة مباشرةً — لا تحويل
  const nativeOk = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(t);
  if (nativeOk) return file;

  // HEIC: بالنوع أو بالامتداد أو بالنوع المجهول (octet-stream/empty)
  const isHeic =
    t.includes("heic") || t.includes("heif") ||
    n.endsWith(".heic") || n.endsWith(".heif") ||
    t === "" || t === "application/octet-stream";

  if (!isHeic) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(result) ? result[0] : result;
    const name = file.name.replace(/\.[^.]+$/, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // إذا فشل heic2any أعد الملف الأصلي (سيتولى الخادم التحويل)
    return file;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ImagePicker — مكوّن مستقل لرفع الصور بدون إعادة رندر خارجية
// ═══════════════════════════════════════════════════════════════════
const ImagePicker = memo(function ImagePicker({ previews, onAdd, onRemove, loadingCount = 0 }: {
  previews: string[];
  onAdd: (files: FileList) => void;
  onRemove: (idx: number) => void;
  loadingCount?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const total = previews.length + loadingCount;
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-border shrink-0">
            <img src={src} className="w-full h-full object-cover" alt="" />
            <button type="button" onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {/* مؤشرات التحميل — تظهر فوراً عند اختيار الصور */}
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={`loading-${i}`}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 flex flex-col items-center justify-center gap-1.5 shrink-0">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            <span className="text-[9px] text-orange-500 font-medium">جارٍ...</span>
          </div>
        ))}
        {total < 8 && (
          <button type="button" onClick={() => ref.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-orange-400 hover:text-orange-500 transition-colors shrink-0">
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs">إضافة</span>
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) { onAdd(e.target.files); e.target.value = ""; } }} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// AddMarketItemForm — مكوّن مستقل بحالته الخاصة (يمنع تطاير الأحرف)
// ═══════════════════════════════════════════════════════════════════
interface AddFormProps {
  onSubmit: (data: {
    title: string; category: string; condition: string; price: number;
    province: string; city: string; phone: string | null;
    shippingAvailable: boolean; description: string | null; imageFiles: File[];
  }) => void;
  isBusy: boolean;
}

const AddMarketItemForm = memo(function AddMarketItemForm({ onSubmit, isBusy }: AddFormProps) {
  const { toast } = useToast();

  // ── uncontrolled refs (منع تطاير الأحرف في Android WebView) ──
  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // ── select/toggle state (لا تسبب مشكلة لأنها ليست حقول نص) ──
  const [category, setCategory] = useState(MARKETPLACE_CATEGORIES[0]);
  const [condition, setCondition] = useState("جيد");
  const [province, setProvince] = useState("");
  const [shipping, setShipping] = useState(false);

  // ── AI description ──
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiDescription = async () => {
    const title = titleRef.current?.value.trim() || "";
    if (!title && !category) {
      toast({ title: "يرجى إدخال عنوان السلعة أو اختيار الفئة أولاً", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiRequest<{ description: string }>("/api/marketplace/ai-description", "POST", {
        title: title || category,
        category,
        condition,
        province: province || undefined,
      });
      if (descRef.current) descRef.current.value = res.description;
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── image state (base64 للمعاينة بدلاً من blob URLs) ──
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imgsLoading, setImgsLoading] = useState(0); // عدد الصور قيد المعالجة

  const addImages = useCallback(async (files: FileList) => {
    const arr = Array.from(files);
    setImgsLoading(arr.length); // أظهر مؤشرات التحميل فوراً
    try {
      // 1. تحويل HEIC → JPEG في المتصفح (يحل مشكلة كاميرات Android/iOS)
      const converted = await Promise.all(arr.map(convertToJpeg));
      // 2. قراءة كـ base64 للمعاينة (يعمل في Capacitor Android على خلاف blob URLs)
      const previews = await Promise.all(converted.map(readAsDataURL));
      setImageFiles(prev => [...prev, ...converted]);
      setImagePreviews(prev => [...prev, ...previews]);
    } finally {
      setImgsLoading(0); // أخفِ المؤشرات بعد الانتهاء أو الفشل
    }
  }, []);

  const removeImage = useCallback((idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = () => {
    const title = titleRef.current?.value.trim() ?? "";
    const priceStr = priceRef.current?.value.trim() ?? "";
    const city = cityRef.current?.value.trim() ?? "";
    const phone = phoneRef.current?.value.trim() || null;
    const description = descRef.current?.value.trim() || null;

    if (!title || !priceStr || !province || !city || !category) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" });
      return;
    }
    const numPrice = Number(priceStr);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "يرجى إدخال سعر صحيح", variant: "destructive" });
      return;
    }
    onSubmit({ title, category, condition, price: numPrice, province, city, phone, shippingAvailable: shipping, description, imageFiles });
  };

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

      {/* العنوان */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">عنوان الإعلان <span className="text-destructive">*</span></Label>
        <Input
          ref={titleRef}
          placeholder="مثال: أريكة جلدية بحالة ممتازة"
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* الفئة */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">الفئة <span className="text-destructive">*</span></Label>
        <BottomSheetSelect value={category} onValueChange={setCategory} placeholder="اختر الفئة">
          {MARKETPLACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </BottomSheetSelect>
      </div>

      {/* الحالة */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">حالة السلعة <span className="text-destructive">*</span></Label>
        <BottomSheetSelect value={condition} onValueChange={setCondition} placeholder="اختر الحالة">
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </BottomSheetSelect>
      </div>

      {/* السعر */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">السعر (ل.س) <span className="text-destructive">*</span></Label>
        <Input
          ref={priceRef}
          type="number"
          inputMode="numeric"
          placeholder="مثال: 50000"
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* المحافظة */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">المحافظة <span className="text-destructive">*</span></Label>
        <BottomSheetSelect value={province} onValueChange={setProvince} placeholder="اختر المحافظة">
          {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </BottomSheetSelect>
      </div>

      {/* المدينة */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">المدينة / الحي <span className="text-destructive">*</span></Label>
        <Input
          ref={cityRef}
          placeholder="مثال: المزة، باب توما..."
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* رقم الهاتف */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">رقم للتواصل</Label>
        <Input
          ref={phoneRef}
          type="tel"
          inputMode="tel"
          placeholder="09xxxxxxxx"
          defaultValue=""
          style={{ fontSize: 16 }}
          dir="ltr"
        />
      </div>

      {/* إتاحة الشحن */}
      <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
        <div>
          <p className="text-sm font-semibold">إتاحة الشحن عبر القدموس</p>
          <p className="text-xs text-muted-foreground mt-0.5">السماح للمشترين بطلب الشحن إلى محافظتهم</p>
        </div>
        <button
          type="button"
          onClick={() => setShipping(v => !v)}
          className={cn(
            "relative w-12 h-6 rounded-full transition-colors shrink-0",
            shipping ? "bg-green-500" : "bg-muted"
          )}
        >
          <span className={cn(
            "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
            shipping ? "translate-x-1" : "translate-x-6"
          )} />
        </button>
      </div>

      {/* الوصف */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">وصف السلعة</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2 border-orange-300 text-orange-600 hover:bg-orange-50"
            onClick={handleAiDescription}
            disabled={aiLoading}
          >
            {aiLoading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />
            }
            كتابة بالذكاء الاصطناعي
          </Button>
        </div>
        <Textarea
          ref={descRef}
          placeholder="صف السلعة بالتفصيل: حجمها، لونها، سبب البيع..."
          defaultValue=""
          rows={4}
          style={{ fontSize: 16 }}
        />
      </div>

      {/* الصور */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">صور السلعة (حتى 8 صور)</Label>
        <ImagePicker previews={imagePreviews} onAdd={addImages} onRemove={removeImage} loadingCount={imgsLoading} />
      </div>

      {/* زر النشر */}
      <div className="pt-1 pb-2">
        <Button
          className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl gap-2"
          onClick={handleSubmit}
          disabled={isBusy}
        >
          {isBusy
            ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري النشر...</>
            : <><Plus className="w-5 h-5" /> نشر الإعلان</>
          }
        </Button>
      </div>

    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// MarketplacePage — الصفحة الرئيسية
// ═══════════════════════════════════════════════════════════════════
export default function MarketplacePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { startChat, loading: startingChat } = useStartChat();

  // filters
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("__all__");
  const [filterCond, setFilterCond] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [filterShipping, setFilterShipping] = useState(false);

  // dialog
  const [addOpen, setAddOpen] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const formKey = useRef(0); // مفتاح لإعادة تهيئة النموذج عند الإغلاق

  // query
  const { data: items = [], isLoading } = useQuery<MarketItem[]>({
    queryKey: ["marketplace", { filterCat, filterCond, filterProv, filterShipping, q }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (filterCat !== "__all__") p.set("category", filterCat);
      if (filterCond !== "__all__") p.set("condition", filterCond);
      if (filterProv !== "__all__") p.set("province", filterProv);
      if (filterShipping) p.set("shipping", "true");
      return apiRequest<MarketItem[]>(`/api/marketplace?${p}`);
    },
    staleTime: 30_000,
  });

  // mutations
  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/marketplace", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر إعلانك بنجاح ✅" });
      formKey.current += 1;
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/marketplace/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان" });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const handleFormSubmit = useCallback(async (data: {
    title: string; category: string; condition: string; price: number;
    province: string; city: string; phone: string | null;
    shippingAvailable: boolean; description: string | null; imageFiles: File[];
  }) => {
    let uploadedUrls: string[] = [];
    if (data.imageFiles.length > 0) {
      setUploadingImgs(true);
      try {
        uploadedUrls = await Promise.all(data.imageFiles.map(f => uploadImage(f)));
      } catch {
        toast({ title: "فشل رفع الصور، حاول مجدداً", variant: "destructive" });
        setUploadingImgs(false);
        return;
      }
      setUploadingImgs(false);
    }
    createMutation.mutate({
      title: data.title,
      category: data.category,
      condition: data.condition,
      price: data.price,
      currency: "SYP",
      province: data.province,
      city: data.city,
      phone: data.phone,
      shippingAvailable: data.shippingAvailable,
      description: data.description,
      images: uploadedUrls,
    });
  }, [createMutation, toast]);

  const isBusy = createMutation.isPending || uploadingImgs;
  const hasFilters = filterCat !== "__all__" || filterCond !== "__all__" || filterProv !== "__all__" || filterShipping || q;

  return (
    <div className="min-h-full bg-background text-foreground pb-4" dir="rtl">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-l from-orange-600 to-amber-700 text-white px-4 pt-6 pb-5">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none flex items-center justify-center">
          <ShoppingBag size={320} strokeWidth={0.5} color="white" />
        </div>
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <ShoppingBag className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">كل شيء</h1>
            <span className="text-xs bg-white/20 border border-white/40 px-2 py-0.5 rounded-full font-medium animate-pulse">🔥 جديد</span>
          </div>
          <p className="text-orange-100 text-sm mb-4">بيع كل ما تملك — أثاث، ملابس، إلكترونيات وأكثر</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-orange-700 hover:bg-orange-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setAddOpen(true); }}
            >
              <Plus className="w-5 h-5" /> أضف سلعة للبيع
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-orange-500/40 hover:bg-orange-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } navigate("/marketplace-orders"); }}
            >
              <Package className="w-5 h-5" /> طلباتي
            </Button>
          </div>
        </div>
      </div>

      {/* ── Category Chips ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setFilterCat("__all__")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
              filterCat === "__all__"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-background text-foreground border-border hover:border-orange-400"
            )}
          >
            الكل
          </button>
          {MARKETPLACE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? "__all__" : cat)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
                filterCat === cat
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-foreground border-border hover:border-orange-400"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="ابحث في كل شيء..."
            defaultValue={search}
            onInput={e => setSearch((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === "Enter") setQ((e.currentTarget as HTMLInputElement).value); }}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterCond} onValueChange={setFilterCond} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الحالة</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">المحافظة</option>
              {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </NativeSelect>
          </div>
          <button
            onClick={() => setFilterShipping(v => !v)}
            className={cn(
              "shrink-0 h-8 px-2 rounded-lg border text-xs flex items-center gap-1 transition-all active:scale-95",
              filterShipping ? "bg-green-500 text-white border-green-500" : "border-border text-muted-foreground"
            )}
          >
            <Truck className="w-3.5 h-3.5" /> شحن
          </button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0 px-2"
              onClick={() => {
                setFilterCat("__all__"); setFilterCond("__all__"); setFilterProv("__all__");
                setFilterShipping(false); setQ(""); setSearch("");
                if (searchRef.current) searchRef.current.value = "";
              }}>
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* ── Listings ── */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-bold mb-1">لا توجد سلع حالياً</p>
            <p className="text-sm mb-4">كن أول من يبيع شيئاً هنا!</p>
            {user && (
              <Button onClick={() => setAddOpen(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4" /> أضف سلعتك الآن
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(item => (
              <ListingCard
                key={item.id}
                type="marketplace"
                data={item}
                onCardClick={() => navigate(`/marketplace/${item.id}`)}
                onChat={item.sellerId !== user?.id ? () => startChat(item.sellerId, `مرحباً، رأيت إعلانك عن "${item.title}" وأودّ الاستفسار`) : undefined}
                onDelete={user?.id === item.sellerId ? () => {
                  if (window.confirm("هل تريد حذف هذا الإعلان؟ لا يمكن التراجع."))
                    deleteMutation.mutate(item.id);
                } : undefined}
                chatLoading={startingChat}
                deleteLoading={deleteMutation.isPending}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ADD LISTING DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) formKey.current += 1; setAddOpen(open); }}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-right text-lg font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" /> إضافة سلعة للبيع
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* مكوّن النموذج المستقل — له حالته الخاصة كاملاً */}
          <AddMarketItemForm
            key={formKey.current}
            onSubmit={handleFormSubmit}
            isBusy={isBusy}
          />

        </DialogContent>
      </Dialog>
    </div>
  );
}
