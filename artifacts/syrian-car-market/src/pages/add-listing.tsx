import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useCreateCar, useGenerateCarDescription } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, ImagePlus, Loader2, CheckCircle2, X, ShieldCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

// ── Market base prices (USD) per brand ─────────────────────────────────────
const MARKET_PRICES: Record<string, number> = {
  toyota: 13000, hyundai: 9500, kia: 9000, nissan: 11000,
  honda: 11500, mazda: 10000, mitsubishi: 9500, suzuki: 7500,
  mercedes: 28000, bmw: 30000, audi: 26000, volkswagen: 17000,
  ford: 15000, chevrolet: 13000, peugeot: 9500, renault: 8500,
  lada: 4500, chery: 7000, geely: 7500, haval: 11000,
  byd: 12000, mg: 9500,
};

function estimateCarPrice(brand: string, year: number, mileage: number, similarPrices: number[]): number {
  const base = MARKET_PRICES[brand.toLowerCase().trim()] ?? 10000;
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  const ageDepreciation = Math.min(age * 0.06, 0.60);
  const mileageFactor = mileage > 200000 ? 0.75 : mileage > 100000 ? 0.88 : mileage > 50000 ? 0.94 : 1.0;
  let estimated = Math.round(base * (1 - ageDepreciation) * mileageFactor);
  if (similarPrices.length > 0) {
    const avgSimilar = similarPrices.reduce((a, b) => a + b, 0) / similarPrices.length;
    estimated = Math.round((estimated + avgSimilar) / 2);
  }
  return Math.max(estimated, 500);
}

type PriceEval = { level: "high" | "low" | "good"; market: number; range: [number, number]; text: string } | null;

type ListingType = "car" | "motorcycle" | "rental" | "parts";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("scm_token");
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "فشل رفع الصورة");
  return data.url!;
}

export default function AddListing() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [priceEval, setPriceEval] = useState<PriceEval>(null);
  const [estimating, setEstimating] = useState(false);
  const [listingType, setListingType] = useState<ListingType>("car");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState({
    brand: "", model: "", year: "2015", price: "", mileage: "0",
    fuelType: "petrol", transmission: "automatic", province: "Damascus",
    city: "", saleType: "cash", category: "sedan", description: "",
    engineCC: "", bikeType: "", dailyPrice: "", weeklyPrice: "",
    rentalDuration: "", partType: "", partCarModel: "", partCarYear: "",
  });

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFields(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === "price") setPriceEval(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 10) {
      toast({ title: "الحد الأقصى 10 صور", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    for (const file of files) {
      try {
        const url = await uploadImage(file);
        setImages(prev => [...prev, url]);
      } catch (err: any) {
        toast({ title: err.message ?? "فشل رفع الصورة", variant: "destructive" });
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const { data: allCarsData } = useQuery<any>({
    queryKey: ["cars-for-price"],
    queryFn: () => api.cars.list({ limit: 200 }),
  });

  const createMutation = useCreateCar();
  const generateDescMutation = useGenerateCarDescription();

  const handleGenerateDesc = () => {
    if (!fields.brand || !fields.model || !fields.year) {
      toast({ title: "الرجاء إدخال الماركة، الموديل وسنة الصنع أولاً", variant: "destructive" });
      return;
    }
    generateDescMutation.mutate({
      data: { brand: fields.brand, model: fields.model, year: Number(fields.year), mileage: Number(fields.mileage), fuelType: fields.fuelType, transmission: fields.transmission }
    }, {
      onSuccess: (res) => setFields(f => ({ ...f, description: res.description })),
      onError: () => {
        const fuelLabel: Record<string, string> = { petrol: "بنزين", diesel: "مازوت", electric: "كهرباء", hybrid: "هجين" };
        const transLabel: Record<string, string> = { automatic: "أوتوماتيك", manual: "يدوي" };
        const template = `للبيع ${fields.brand} ${fields.model} موديل ${fields.year}

السيارة بحالة ممتازة وجاهزة للفحص والتجربة.
نوع الوقود: ${fuelLabel[fields.fuelType] ?? fields.fuelType}
ناقل الحركة: ${transLabel[fields.transmission] ?? fields.transmission}
${fields.mileage ? `عداد: ${Number(fields.mileage).toLocaleString()} كم` : ""}
${fields.price ? `السعر المطلوب: ${Number(fields.price).toLocaleString()} $` : ""}

التواصل عبر الرسائل أو الاتصال المباشر.`;
        setFields(f => ({ ...f, description: template }));
      }
    });
  };

  const handleEstimatePrice = async () => {
    if (!fields.brand || !fields.year) {
      toast({ title: "الرجاء إدخال الماركة وسنة الصنع أولاً", variant: "destructive" });
      return;
    }
    setEstimating(true);
    try {
      const year = Number(fields.year) || 2015;
      const mileage = Number(fields.mileage) || 0;
      const entered = Number(fields.price) || 0;

      const cars = (allCarsData?.cars ?? []) as any[];
      const similar = cars.filter((c: any) => {
        const brandMatch = c.brand?.toLowerCase() === fields.brand.toLowerCase();
        const yearMatch = Math.abs((c.year ?? 0) - year) <= 3;
        return brandMatch && yearMatch && c.price > 0;
      });
      const similarPrices = similar.map((c: any) => Number(c.price)).filter(Boolean);

      const estimated = estimateCarPrice(fields.brand, year, mileage, similarPrices);
      const low = Math.round(estimated * 0.88);
      const high = Math.round(estimated * 1.12);

      if (entered > 0) {
        if (entered > high) {
          setPriceEval({ level: "high", market: estimated, range: [low, high], text: `السعر أعلى من السوق — يُقترح النطاق: ${low.toLocaleString()} – ${high.toLocaleString()} $` });
        } else if (entered < low) {
          setPriceEval({ level: "low", market: estimated, range: [low, high], text: `السعر أقل من السوق — يُقترح النطاق: ${low.toLocaleString()} – ${high.toLocaleString()} $` });
        } else {
          setPriceEval({ level: "good", market: estimated, range: [low, high], text: `السعر مناسب للسوق — النطاق المقترح: ${low.toLocaleString()} – ${high.toLocaleString()} $` });
        }
      } else {
        const suggested = Math.round(estimated * 0.95);
        setPriceEval({ level: "good", market: estimated, range: [low, high], text: `سعر مقترح: ${suggested.toLocaleString()} $ (نطاق: ${low.toLocaleString()} – ${high.toLocaleString()} $)` });
        setFields(f => ({ ...f, price: String(suggested) }));
      }
      if (similar.length > 0) {
        toast({ title: `تم تحليل ${similar.length} إعلان مشابه`, description: "تم تحديث تقييم السعر" });
      }
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length < 1) {
      toast({ title: "يجب إضافة صورة واحدة على الأقل", variant: "destructive" });
      return;
    }

    const price = Number(fields.price);
    if (!price || price <= 0) {
      toast({ title: "الرجاء إدخال سعر صحيح", variant: "destructive" });
      return;
    }

    let data: Record<string, any>;
    if (listingType === "car") {
      data = {
        brand: fields.brand, model: fields.model, year: Number(fields.year),
        price, mileage: Number(fields.mileage), fuelType: fields.fuelType,
        transmission: fields.transmission, province: fields.province,
        city: fields.city, saleType: fields.saleType, category: fields.category,
        description: fields.description, images,
      };
    } else if (listingType === "motorcycle") {
      data = {
        brand: fields.brand, model: fields.model, year: Number(fields.year),
        price, category: "motorcycle", description: fields.description,
        province: fields.province, city: fields.city, saleType: fields.saleType,
        fuelType: "petrol", transmission: "manual", mileage: 0,
        images,
      };
    } else if (listingType === "rental") {
      data = {
        brand: fields.brand, model: fields.model, year: Number(fields.year),
        price: Number(fields.dailyPrice) || price, category: "rental",
        saleType: "rental", province: fields.province, city: fields.city,
        description: fields.description, fuelType: "petrol", transmission: "automatic",
        mileage: 0, images,
      };
    } else {
      data = {
        brand: fields.partCarModel || fields.brand, model: fields.partType,
        year: Number(fields.partCarYear) || Number(fields.year),
        price, category: "parts", saleType: "cash",
        province: fields.province, city: fields.city,
        description: fields.description, fuelType: "petrol", transmission: "manual",
        mileage: 0, images,
      };
    }

    createMutation.mutate({ data } as any, {
      onSuccess: (res) => navigate(`/cars/${(res as any).id}`),
      onError: (err: any) => toast({ title: err.message ?? "حدث خطأ", variant: "destructive" }),
    });
  };

  if (user?.role !== 'seller' && user?.role !== 'dealer') {
    return (
      <div className="py-20 text-center px-4">
        <div className="max-w-md mx-auto bg-card p-8 rounded-3xl border shadow-lg">
          <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">عذراً، لا يمكنك إضافة إعلان</h2>
          <p className="text-muted-foreground mb-6">هذه الميزة متاحة فقط لأصحاب حسابات البائعين والمعارض.</p>
          <Button onClick={() => navigate('/profile')} className="w-full rounded-xl">تغيير نوع الحساب</Button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none";
  const selectCls = `${inputCls}`;

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">نشر إعلان بيع</h1>
        <p className="text-muted-foreground mt-2">اختر نوع الإعلان وأدخل التفاصيل لزيادة فرص البيع</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Step 0: Listing Type ── */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">1</span>
            نوع الإعلان
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { value: "car",        label: "🚗 سيارة" },
              { value: "motorcycle", label: "🏍️ دراجة نارية" },
              { value: "rental",     label: "🔑 تأجير" },
              { value: "parts",      label: "🔧 قطع غيار" },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setListingType(opt.value)}
                className={`rounded-2xl border-2 py-3 px-4 font-bold text-sm transition-all
                  ${listingType === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Step 1: Images ── */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">2</span>
            الصور
            <span className="text-sm text-muted-foreground font-normal mr-auto">{images.length}/10</span>
          </h3>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((url, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border">
                  <img src={url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-md">رئيسية</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:bg-secondary/20 transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <ImagePlus className="w-6 h-6 text-muted-foreground" />}
                </button>
              )}
            </div>
          )}

          {images.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-secondary/20 transition-colors disabled:opacity-50"
            >
              {isUploading
                ? <><Loader2 className="w-10 h-10 animate-spin text-primary mb-3" /><p className="text-sm text-muted-foreground">جارٍ التحقق من الصورة...</p></>
                : <><ImagePlus className="w-12 h-12 text-muted-foreground mb-3" /><p className="font-medium text-foreground mb-1">اضغط هنا لرفع الصور</p><p className="text-sm text-muted-foreground">أقصى حد 10 صور</p></>
              }
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </div>

        {/* ── Step 2: Dynamic Fields ── */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">3</span>
            المعلومات الأساسية
          </h3>

          {/* CAR fields */}
          {listingType === "car" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">الشركة (Brand)</label>
                <input name="brand" value={fields.brand} onChange={handleField} className={inputCls} placeholder="مثال: تويوتا" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الموديل (Model)</label>
                <input name="model" value={fields.model} onChange={handleField} className={inputCls} placeholder="مثال: كورولا" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سنة الصنع</label>
                <input type="number" name="year" value={fields.year} onChange={handleField} className={inputCls} min="1950" max="2025" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">عدد الكيلومترات</label>
                <input type="number" name="mileage" value={fields.mileage} onChange={handleField} className={inputCls} min="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">ناقل الحركة</label>
                <select name="transmission" value={fields.transmission} onChange={handleField} className={selectCls}>
                  <option value="automatic">أوتوماتيك</option>
                  <option value="manual">يدوي</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع الوقود</label>
                <select name="fuelType" value={fields.fuelType} onChange={handleField} className={selectCls}>
                  <option value="petrol">بنزين</option>
                  <option value="diesel">مازوت</option>
                  <option value="electric">كهرباء</option>
                  <option value="hybrid">هجين (هايبرد)</option>
                </select>
              </div>
            </div>
          )}

          {/* MOTORCYCLE fields */}
          {listingType === "motorcycle" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">الشركة</label>
                <input name="brand" value={fields.brand} onChange={handleField} className={inputCls} placeholder="مثال: هوندا" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سعة المحرك (CC)</label>
                <input type="number" name="engineCC" value={fields.engineCC} onChange={handleField} className={inputCls} placeholder="مثال: 125" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سنة الصنع</label>
                <input type="number" name="year" value={fields.year} onChange={handleField} className={inputCls} min="1950" max="2025" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع الدراجة</label>
                <select name="bikeType" value={fields.bikeType} onChange={handleField} className={selectCls}>
                  <option value="">اختر النوع</option>
                  <option value="sport">رياضية</option>
                  <option value="cruiser">كروزر</option>
                  <option value="scooter">سكوتر</option>
                  <option value="offroad">أوف رود</option>
                </select>
              </div>
            </div>
          )}

          {/* RENTAL fields */}
          {listingType === "rental" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع السيارة</label>
                <input name="brand" value={fields.brand} onChange={handleField} className={inputCls} placeholder="مثال: تويوتا كامري" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الموديل</label>
                <input name="model" value={fields.model} onChange={handleField} className={inputCls} placeholder="مثال: 2022" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">السعر اليومي (USD)</label>
                <input type="number" name="dailyPrice" value={fields.dailyPrice} onChange={handleField} className={inputCls} placeholder="مثال: 30" min="1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">السعر الأسبوعي (USD)</label>
                <input type="number" name="weeklyPrice" value={fields.weeklyPrice} onChange={handleField} className={inputCls} placeholder="مثال: 180" min="1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المدينة</label>
                <input name="city" value={fields.city} onChange={handleField} className={inputCls} placeholder="دمشق" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">مدة الإيجار</label>
                <select name="rentalDuration" value={fields.rentalDuration} onChange={handleField} className={selectCls}>
                  <option value="">غير محدد</option>
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                </select>
              </div>
            </div>
          )}

          {/* CAR PARTS fields */}
          {listingType === "parts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع القطعة</label>
                <input name="partType" value={fields.partType} onChange={handleField} className={inputCls} placeholder="مثال: محرك، ناقل حركة، صدام..." required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع السيارة</label>
                <input name="brand" value={fields.brand} onChange={handleField} className={inputCls} placeholder="مثال: تويوتا" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">موديل السيارة</label>
                <input name="partCarModel" value={fields.partCarModel} onChange={handleField} className={inputCls} placeholder="مثال: كامري" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سنة السيارة</label>
                <input type="number" name="partCarYear" value={fields.partCarYear} onChange={handleField} className={inputCls} placeholder="مثال: 2015" />
              </div>
            </div>
          )}

          {/* Shared: Province / City / Sale Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
            {listingType !== "rental" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold">المحافظة</label>
                  <select name="province" value={fields.province} onChange={handleField} className={selectCls}>
                    <option value="Damascus">دمشق</option>
                    <option value="Aleppo">حلب</option>
                    <option value="Homs">حمص</option>
                    <option value="Latakia">اللاذقية</option>
                    <option value="Tartus">طرطوس</option>
                    <option value="Hama">حماة</option>
                    <option value="Idlib">إدلب</option>
                    <option value="Deir ez-Zor">دير الزور</option>
                    <option value="Raqqa">الرقة</option>
                    <option value="Daraa">درعا</option>
                    <option value="Sweida">السويداء</option>
                    <option value="Quneitra">القنيطرة</option>
                    <option value="Hasakah">الحسكة</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">المدينة/المنطقة</label>
                  <input name="city" value={fields.city} onChange={handleField} className={inputCls} />
                </div>
              </>
            )}
            {listingType === "car" && (
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع البيع</label>
                <select name="saleType" value={fields.saleType} onChange={handleField} className={selectCls}>
                  <option value="cash">نقد</option>
                  <option value="installment">أقساط</option>
                  <option value="barter">مقايضة</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 3: AI Section ── */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="w-40 h-40 text-white" />
          </div>
          <div className="relative z-10 space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-white mb-2">
              <span className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0">4</span>
              السعر والوصف ✨
            </h3>

            {/* Price */}
            <div className="space-y-4 bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-bold text-white/90">
                    {listingType === "rental" ? "السعر اليومي (USD $)" : "السعر المطلوب (USD $)"}
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={fields.price}
                    onChange={handleField}
                    placeholder="مثال: 8500"
                    min="1"
                    required
                    className="w-full rounded-xl border-2 border-white/20 px-4 py-3 bg-white text-gray-900 focus:border-accent transition-all outline-none font-bold text-lg placeholder:text-gray-400"
                  />
                </div>
                {listingType === "car" && (
                  <Button
                    type="button"
                    onClick={handleEstimatePrice}
                    disabled={estimating}
                    className="rounded-xl h-12 px-6 gap-2 bg-accent hover:bg-accent/90 text-white font-bold border-0 shadow-lg shadow-accent/30 shrink-0"
                  >
                    {estimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    اقتراح السعر
                  </Button>
                )}
              </div>

              {priceEval && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border font-medium text-sm
                  ${priceEval.level === "high"
                    ? "bg-red-500/20 border-red-400/40 text-red-200"
                    : priceEval.level === "low"
                    ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                    : "bg-green-500/20 border-green-400/40 text-green-200"
                  }`}
                >
                  {priceEval.level === "high" && <TrendingUp className="w-5 h-5 shrink-0 mt-0.5" />}
                  {priceEval.level === "low"  && <TrendingDown className="w-5 h-5 shrink-0 mt-0.5" />}
                  {priceEval.level === "good" && <Minus className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold mb-0.5">
                      {priceEval.level === "high" ? "السعر أعلى من السوق" : priceEval.level === "low" ? "السعر أقل من السوق" : "السعر مناسب للسوق"}
                    </p>
                    <p className="leading-relaxed">{priceEval.text}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-4 bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <label className="text-sm font-bold text-white/90 flex-1">وصف الإعلان</label>
                {listingType === "car" && (
                  <Button
                    type="button"
                    onClick={handleGenerateDesc}
                    disabled={generateDescMutation.isPending}
                    className="rounded-xl h-10 px-5 gap-2 bg-accent hover:bg-accent/90 text-white font-bold border-0 text-sm shadow-lg shadow-accent/30 shrink-0"
                  >
                    {generateDescMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    توليد وصف جذاب
                  </Button>
                )}
              </div>
              <textarea
                name="description"
                value={fields.description}
                onChange={handleField}
                rows={6}
                className="w-full rounded-xl border-2 border-white/20 px-4 py-3 bg-white text-gray-900 focus:border-accent transition-all outline-none resize-none leading-relaxed placeholder:text-gray-400"
                placeholder="اكتب وصفاً مفصلاً..."
              />
              {generateDescMutation.isSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-300">
                  <CheckCircle2 className="w-4 h-4" /> تم توليد الوصف بنجاح
                </div>
              )}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-2xl h-14 text-lg font-bold bg-primary text-white shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all">
          {createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "نشر الإعلان"}
        </Button>
      </form>
    </div>
  );
}
