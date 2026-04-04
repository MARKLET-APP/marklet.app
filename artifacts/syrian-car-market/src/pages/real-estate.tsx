// UI_ID: REAL_ESTATE_01 — CLEAN REBUILD
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
  Search, Plus, Building2, Loader2,
  ShoppingCart, Sparkles, ImagePlus, X,
} from "lucide-react";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BuyRequestCard } from "@/components/BuyRequestCard";
import { withApi } from "@/lib/runtimeConfig";

const LISTING_TYPES = ["بيع", "إيجار"];
const SUB_CATEGORIES = ["شقق", "منازل وفيلات", "أراضي", "مكاتب", "محلات تجارية", "مستودعات", "استديو", "غرفة"];

type RealEstate = {
  id: number; sellerId: number; title: string; listingType: string; subCategory: string;
  price: string; area: string | null; rooms: number | null; province: string; city: string;
  images: string[] | null; isFeatured: boolean; viewCount: number; createdAt: string;
  sellerName: string | null;
};

// ── Helper: upload a single image file ──────────────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(withApi("/api/upload-image?folder=real-estate"), {
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

/** تحويل HEIC/HEIF → JPEG في المتصفح باستخدام heic2any */
async function convertToJpeg(file: File): Promise<File> {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  const isHeic = t.includes("heic") || t.includes("heif") || n.endsWith(".heic") || n.endsWith(".heif");
  if (!isHeic) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// ── ImagePicker مستقل ───────────────────────────────────────────────────────
const ImagePicker = memo(function ImagePicker({
  previews, onAdd, onRemove, loadingCount = 0,
}: {
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
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {/* مؤشرات التحميل — تظهر فوراً عند اختيار الصور */}
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={`loading-${i}`}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1.5 shrink-0">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-[9px] text-primary/70 font-medium">جارٍ...</span>
          </div>
        ))}
        {total < 8 && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs">إضافة</span>
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) { onAdd(e.target.files); e.target.value = ""; } }}
      />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// AddRealEstateForm — مكوّن مستقل (يمنع تطاير الأحرف + صور base64)
// ═══════════════════════════════════════════════════════════════════
interface AddListingData {
  title: string; listingType: string; subCategory: string;
  price: number; currency: string;
  area: string | null; rooms: number | null; bathrooms: number | null; floor: number | null;
  province: string; city: string; location: string | null; phone: string | null;
  description: string | null; imageFiles: File[];
}

const AddRealEstateForm = memo(function AddRealEstateForm({
  onSubmit, isBusy,
}: { onSubmit: (data: AddListingData) => void; isBusy: boolean }) {
  const { toast } = useToast();

  // uncontrolled refs
  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const roomsRef = useRef<HTMLInputElement>(null);
  const bathroomsRef = useRef<HTMLInputElement>(null);
  const floorRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // select state
  const [listingType, setListingType] = useState("بيع");
  const [subCategory, setSubCategory] = useState("شقق");
  const [currency, setCurrency] = useState("USD");
  const [province, setProvince] = useState("");

  // image state (base64 للمعاينة بدلاً من blob URLs)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imgsLoading, setImgsLoading] = useState(0); // عدد الصور قيد المعالجة

  const addImages = useCallback(async (files: FileList) => {
    const arr = Array.from(files);
    setImgsLoading(arr.length); // أظهر مؤشرات التحميل فوراً
    try {
      // تحويل HEIC → JPEG في المتصفح أولاً
      const converted = await Promise.all(arr.map(convertToJpeg));
      const previews = await Promise.all(converted.map(readAsDataURL));
      setImageFiles(prev => [...prev, ...converted]);
      setImagePreviews(prev => [...prev, ...previews]);
    } finally {
      setImgsLoading(0);
    }
  }, []);

  const removeImage = useCallback((idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // AI description
  const [aiLoading, setAiLoading] = useState(false);
  const handleAiDescription = async () => {
    if (!subCategory || !province) {
      toast({ title: "يرجى تحديد نوع العقار والمحافظة أولاً", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiRequest<{ description: string }>("/api/real-estate/ai-description", "POST", {
        title: titleRef.current?.value || `${subCategory} للـ${listingType}`,
        listingType,
        subCategory,
        area: areaRef.current?.value || undefined,
        rooms: roomsRef.current?.value || undefined,
        province,
        city: cityRef.current?.value || undefined,
      });
      // تعيين قيمة الـ textarea مباشرة بدون state (uncontrolled)
      if (descRef.current) descRef.current.value = res.description;
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = () => {
    const title = titleRef.current?.value.trim() ?? "";
    const priceStr = priceRef.current?.value.trim() ?? "";
    const city = cityRef.current?.value.trim() ?? "";

    if (!title || !priceStr || !province || !city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية (العنوان، السعر، المحافظة، المدينة)", variant: "destructive" });
      return;
    }
    const numPrice = Number(priceStr);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "يرجى إدخال سعر صحيح", variant: "destructive" });
      return;
    }
    const areaVal = areaRef.current?.value.trim();
    const roomsVal = roomsRef.current?.value.trim();
    const bathroomsVal = bathroomsRef.current?.value.trim();
    const floorVal = floorRef.current?.value.trim();

    onSubmit({
      title,
      listingType,
      subCategory,
      price: numPrice,
      currency,
      area: areaVal || null,
      rooms: roomsVal ? Number(roomsVal) : null,
      bathrooms: bathroomsVal ? Number(bathroomsVal) : null,
      floor: floorVal ? Number(floorVal) : null,
      province,
      city,
      location: locationRef.current?.value.trim() || null,
      phone: phoneRef.current?.value.trim() || null,
      description: descRef.current?.value.trim() || null,
      imageFiles,
    });
  };

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

      {/* العنوان */}
      <div>
        <Label className="mb-1 block">العنوان *</Label>
        <Input
          ref={titleRef}
          placeholder="مثال: شقة للبيع في دمشق - المزة"
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* نوع + فئة */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">نوع الإعلان *</Label>
          <BottomSheetSelect value={listingType} onValueChange={setListingType} placeholder="النوع">
            {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">الفئة *</Label>
          <BottomSheetSelect value={subCategory} onValueChange={setSubCategory} placeholder="الفئة">
            {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
          </BottomSheetSelect>
        </div>
      </div>

      {/* السعر + العملة */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Label className="mb-1 block">السعر *</Label>
          <Input
            ref={priceRef}
            type="number"
            inputMode="numeric"
            placeholder="السعر"
            defaultValue=""
            style={{ fontSize: 16 }}
          />
        </div>
        <div>
          <Label className="mb-1 block">العملة</Label>
          <BottomSheetSelect value={currency} onValueChange={setCurrency} placeholder="USD">
            <option value="USD">USD</option>
            <option value="SYP">SYP</option>
          </BottomSheetSelect>
        </div>
      </div>

      {/* المساحة + الغرف */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">المساحة (م²)</Label>
          <Input ref={areaRef} type="number" inputMode="numeric" placeholder="المساحة" defaultValue="" style={{ fontSize: 16 }} />
        </div>
        <div>
          <Label className="mb-1 block">عدد الغرف</Label>
          <Input ref={roomsRef} type="number" inputMode="numeric" placeholder="الغرف" defaultValue="" style={{ fontSize: 16 }} />
        </div>
      </div>

      {/* الحمامات + الطابق */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">عدد الحمامات</Label>
          <Input ref={bathroomsRef} type="number" inputMode="numeric" placeholder="الحمامات" defaultValue="" style={{ fontSize: 16 }} />
        </div>
        <div>
          <Label className="mb-1 block">رقم الطابق</Label>
          <Input ref={floorRef} type="number" inputMode="numeric" placeholder="الطابق" defaultValue="" style={{ fontSize: 16 }} />
        </div>
      </div>

      {/* المحافظة + المدينة */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">المحافظة *</Label>
          <BottomSheetSelect value={province} onValueChange={setProvince} placeholder="اختر المحافظة">
            {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">المدينة *</Label>
          <Input
            ref={cityRef}
            placeholder="المدينة أو الحي"
            defaultValue=""
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      {/* تفاصيل الموقع */}
      <div>
        <Label className="mb-1 block">تفاصيل الموقع</Label>
        <Input
          ref={locationRef}
          placeholder="مثال: قرب مسجد الروضة، شارع الثورة"
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* رقم الهاتف */}
      <div>
        <Label className="mb-1 block">رقم الهاتف / واتساب</Label>
        <Input
          ref={phoneRef}
          type="tel"
          placeholder="مثال: 0991234567"
          defaultValue=""
          style={{ fontSize: 16 }}
          dir="ltr"
        />
      </div>

      {/* الوصف */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>الوصف</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 px-2"
            onClick={handleAiDescription} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            كتابة بالذكاء الاصطناعي
          </Button>
        </div>
        <Textarea
          ref={descRef}
          placeholder="وصف تفصيلي للعقار..."
          defaultValue=""
          rows={3}
          style={{ fontSize: 16 }}
        />
      </div>

      {/* الصور */}
      <div>
        <Label className="mb-2 block">الصور</Label>
        <ImagePicker previews={imagePreviews} onAdd={addImages} onRemove={removeImage} loadingCount={imgsLoading} />
        {imageFiles.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{imageFiles.length} صورة — سيتم رفعها عند النشر</p>
        )}
      </div>

      <Button className="w-full h-12 text-base font-bold" onClick={handleSubmit} disabled={isBusy}>
        {isBusy
          ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جارٍ النشر...</>
          : "نشر الإعلان"
        }
      </Button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// BuyRequestForm — نموذج طلب شراء عقار المستقل
// ═══════════════════════════════════════════════════════════════════
interface BuyRequestData {
  propertyType: string; maxPrice: string; currency: string; province: string; city: string; description: string;
}

const BuyRequestForm = memo(function BuyRequestForm({
  onSubmit, isBusy,
}: { onSubmit: (data: BuyRequestData) => void; isBusy: boolean }) {
  const { toast } = useToast();

  // uncontrolled refs
  const maxPriceRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // select state
  const [propertyType, setPropertyType] = useState("شقق");
  const [currency, setCurrency] = useState("USD");
  const [province, setProvince] = useState("");

  const handleSubmit = () => {
    const city = cityRef.current?.value.trim() ?? "";
    if (!province || !city) {
      toast({ title: "يرجى تحديد المحافظة والمدينة", variant: "destructive" });
      return;
    }
    onSubmit({
      propertyType,
      maxPrice: maxPriceRef.current?.value.trim() ?? "",
      currency,
      province,
      city,
      description: descRef.current?.value.trim() ?? "",
    });
  };

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

      <div>
        <Label className="mb-1 block">نوع العقار المطلوب *</Label>
        <BottomSheetSelect value={propertyType} onValueChange={setPropertyType} placeholder="نوع العقار">
          {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
        </BottomSheetSelect>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Label className="mb-1 block">الميزانية القصوى</Label>
          <Input
            ref={maxPriceRef}
            type="number"
            inputMode="numeric"
            placeholder="أعلى سعر"
            defaultValue=""
            style={{ fontSize: 16 }}
          />
        </div>
        <div>
          <Label className="mb-1 block">العملة</Label>
          <BottomSheetSelect value={currency} onValueChange={setCurrency} placeholder="USD">
            <option value="USD">USD</option>
            <option value="SYP">SYP</option>
          </BottomSheetSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">المحافظة *</Label>
          <BottomSheetSelect value={province} onValueChange={setProvince} placeholder="اختر المحافظة">
            {SYRIAN_PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">المدينة / الحي *</Label>
          <Input
            ref={cityRef}
            placeholder="مثال: المزة، المهاجرين"
            defaultValue=""
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1 block">تفاصيل إضافية</Label>
        <Textarea
          ref={descRef}
          placeholder="مثال: أبحث عن شقة بغرفتين..."
          defaultValue=""
          rows={3}
          style={{ fontSize: 16 }}
        />
      </div>

      <Button className="w-full gap-2 bg-teal-700 hover:bg-teal-800 h-12 text-base font-bold"
        onClick={handleSubmit} disabled={isBusy}>
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
        إرسال طلب الشراء
      </Button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// RealEstatePage — الصفحة الرئيسية
// ═══════════════════════════════════════════════════════════════════
export default function RealEstatePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { startChat, loading: startingChat } = useStartChat();

  // Filter state
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("__all__");
  const [filterSub, setFilterSub] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [tab, setTab] = useState<"listings" | "requests">("listings");

  // dialogs — formKey forces remount (reset) on open/close
  const [addOpen, setAddOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const addFormKey = useRef(0);
  const buyFormKey = useRef(0);
  const [uploadingImgs, setUploadingImgs] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────
  const activeType = filterType === "__all__" ? "" : filterType;
  const activeSub = filterSub === "__all__" ? "" : filterSub;
  const activeProv = filterProv === "__all__" ? "" : filterProv;

  const { data: listings = [], isLoading } = useQuery<RealEstate[]>({
    queryKey: ["real-estate", { activeType, activeSub, activeProv, q }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (activeType) p.set("listingType", activeType);
      if (activeSub) p.set("subCategory", activeSub);
      if (activeProv) p.set("province", activeProv);
      return apiRequest<RealEstate[]>(`/api/real-estate?${p}`);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: buyReqs = [], isLoading: buyLoading } = useQuery({
    queryKey: ["buy-requests", "real-estate"],
    queryFn: () => apiRequest<any[]>("/api/buy-requests?category=real-estate"),
  });

  // ── Mutations ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/real-estate", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر إعلانك بنجاح" });
      addFormKey.current += 1;
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["real-estate"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const buyMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/buy-requests", "POST", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلبك بنجاح" });
      buyFormKey.current += 1;
      setBuyOpen(false);
      qc.invalidateQueries({ queryKey: ["buy-requests", "real-estate"] });
    },
    onError: () => toast({ title: "فشل إرسال الطلب", variant: "destructive" }),
  });

  const deleteBuyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buy-requests", "real-estate"] }),
  });

  const deleteListingMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/real-estate/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان بنجاح" });
      qc.invalidateQueries({ queryKey: ["real-estate"] });
    },
    onError: () => toast({ title: "فشل حذف الإعلان", variant: "destructive" }),
  });

  // ── Callbacks ────────────────────────────────────────────────────
  const handleAddSubmit = useCallback(async (data: AddListingData) => {
    let uploadedUrls: string[] = [];
    if (data.imageFiles.length > 0) {
      setUploadingImgs(true);
      try {
        uploadedUrls = await Promise.all(data.imageFiles.map(f => uploadImage(f)));
      } catch {
        toast({ title: "فشل رفع بعض الصور، حاول مجدداً", variant: "destructive" });
        setUploadingImgs(false);
        return;
      }
      setUploadingImgs(false);
    }
    createMutation.mutate({
      title: data.title,
      listingType: data.listingType,
      subCategory: data.subCategory,
      price: data.price,
      currency: data.currency,
      area: data.area,
      rooms: data.rooms,
      bathrooms: data.bathrooms,
      floor: data.floor,
      province: data.province,
      city: data.city,
      location: data.location,
      phone: data.phone,
      description: data.description,
      images: uploadedUrls,
    });
  }, [createMutation, toast]);

  const handleBuySubmit = useCallback((data: BuyRequestData) => {
    buyMutation.mutate({
      brand: data.propertyType,
      maxPrice: data.maxPrice ? Number(data.maxPrice) : null,
      currency: data.currency,
      city: data.city,
      description: `المحافظة: ${data.province}${data.description ? `\n${data.description}` : ""}`,
      category: "real-estate",
    });
  }, [buyMutation]);

  const isBusy = createMutation.isPending || uploadingImgs;

  return (
    <div className="min-h-full bg-background text-foreground pb-4" dir="rtl">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-l from-cyan-700 to-teal-900 text-white px-4 pt-6 pb-5">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none flex items-center justify-center">
          <Building2 size={320} strokeWidth={0.5} color="white" />
        </div>
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">العقارات</h1>
          </div>
          <p className="text-cyan-100 text-sm mb-4">شقق، منازل، أراضي وعقارات تجارية في سورية</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-teal-800 hover:bg-teal-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setAddOpen(true); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان عقاري
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-teal-500/40 hover:bg-teal-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } setBuyOpen(true); }}
            >
              <ShoppingCart className="w-5 h-5" /> طلب شراء عقار
            </Button>
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="ابحث في العقارات..."
            defaultValue={search}
            onInput={e => setSearch((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === "Enter") setQ((e.currentTarget as HTMLInputElement).value); }}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 pb-1">
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterType} onValueChange={setFilterType} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </div>
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterSub} onValueChange={setFilterSub} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </div>
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </NativeSelect>
          </div>
          {(activeType || activeSub || activeProv || q) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0"
              onClick={() => { setFilterType("__all__"); setFilterSub("__all__"); setFilterProv("__all__"); setQ(""); setSearch(""); if (searchRef.current) searchRef.current.value = ""; }}>
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b px-4">
        <button
          className={cn("flex-1 pb-3 pt-3 text-sm font-semibold transition-colors", tab === "listings" ? "text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400" : "text-muted-foreground")}
          onClick={() => setTab("listings")}
        >
          إعلانات العقارات {listings.length > 0 && <span className="mr-1 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 rounded-full px-2 py-0.5">{listings.length}</span>}
        </button>
        <button
          className={cn("flex-1 pb-3 pt-3 text-sm font-semibold transition-colors", tab === "requests" ? "text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400" : "text-muted-foreground")}
          onClick={() => setTab("requests")}
        >
          طلبات الشراء {(buyReqs as any[]).length > 0 && <span className="mr-1 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 rounded-full px-2 py-0.5">{(buyReqs as any[]).length}</span>}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        {tab === "listings" && (
          isLoading
            ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : listings.length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>لا توجد إعلانات عقارية حالياً</p>
                </div>
              )
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings.map(item => (
                    <ListingCard
                      key={item.id}
                      type="real-estate"
                      data={item}
                      onCardClick={() => navigate(`/real-estate/${item.id}`)}
                      onChat={item.sellerId ? () => startChat(item.sellerId, `مرحباً، رأيت إعلانك عن "${item.title}" وأودّ الاستفسار`) : undefined}
                      onDelete={user?.id === item.sellerId ? () => { if (window.confirm("هل تريد حذف هذا الإعلان؟ لا يمكن التراجع.")) deleteListingMutation.mutate(item.id); } : undefined}
                      chatLoading={startingChat}
                      deleteLoading={deleteListingMutation.isPending}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )
        )}

        {tab === "requests" && (
          buyLoading
            ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : (buyReqs as any[]).length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-bold mb-2">لا توجد طلبات شراء حالياً</p>
                  <p className="text-sm mb-4">هل تبحث عن عقار معين؟ انشر طلبك وسيتواصل معك أصحاب العقارات</p>
                  {user && <Button onClick={() => setBuyOpen(true)} className="gap-2"><ShoppingCart className="w-4 h-4" /> نشر طلب شراء</Button>}
                </div>
              )
              : (
                <div className="flex flex-col gap-3">
                  {(buyReqs as any[]).map((req: any) => (
                    <BuyRequestCard
                      key={req.id}
                      data={{ ...req, type: req.brand || "عقار" }}
                      currentUserId={user?.id}
                      accentColor="cyan"
                      label="طلب شراء عقار"
                      onChat={user && req.userId !== user.id ? () => startChat(req.userId, `مرحباً، لديّ عقار قد يناسب طلبك`) : undefined}
                      chatLoading={startingChat}
                      onDelete={user && req.userId === user.id ? () => deleteBuyMutation.mutate(req.id) : undefined}
                      deleteLoading={deleteBuyMutation.isPending}
                    />
                  ))}
                </div>
              )
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ADD LISTING DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) addFormKey.current += 1; setAddOpen(open); }}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-right text-lg font-bold">نشر إعلان عقاري</DialogTitle>
            </DialogHeader>
          </div>
          <AddRealEstateForm
            key={addFormKey.current}
            onSubmit={handleAddSubmit}
            isBusy={isBusy}
          />
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          BUY REQUEST DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={buyOpen} onOpenChange={(open) => { if (!open) buyFormKey.current += 1; setBuyOpen(open); }}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">طلب شراء عقار</DialogTitle>
            </DialogHeader>
          </div>
          <BuyRequestForm
            key={buyFormKey.current}
            onSubmit={handleBuySubmit}
            isBusy={buyMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


function InfoRow({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{val}</span>
    </div>
  );
}
