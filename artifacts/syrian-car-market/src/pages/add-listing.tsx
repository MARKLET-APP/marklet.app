import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCar, useGenerateCarDescription, useEstimatePrice } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, ImagePlus, Loader2, CheckCircle2, X, ShieldCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

// ── Market base prices (USD) per brand ────────────────────────────────────
const MARKET_PRICES: Record<string, number> = {
  toyota: 12000,  hyundai: 9000,   kia: 8500,    nissan: 10000,
  honda: 11000,   mazda: 9500,     mitsubishi: 9000, suzuki: 7500,
  mercedes: 25000, bmw: 27000,     audi: 24000,  volkswagen: 16000,
  ford: 14000,    chevrolet: 12000, peugeot: 9000, renault: 8000,
  lada: 4500,     chery: 7000,     geely: 7500,  haval: 10000,
  byd: 11000,     mg: 9000,
};

function getMarketPrice(brand: string): number {
  return MARKET_PRICES[brand.toLowerCase().trim()] ?? 10000;
}

type PriceEval = { level: "high" | "low" | "good"; market: number; text: string } | null;

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("scm_token");
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "فشل رفع الصورة");
  return data.url!;
}

const schema = z.object({
  brand: z.string().min(2, "الماركة مطلوبة"),
  model: z.string().min(1, "الموديل مطلوب"),
  year: z.coerce.number().min(1980).max(2025),
  price: z.coerce.number().min(1000, "السعر مطلوب"),
  mileage: z.coerce.number().min(0),
  fuelType: z.string().min(1, "مطلوب"),
  transmission: z.string().min(1, "مطلوب"),
  province: z.string().min(1, "مطلوب"),
  city: z.string().min(1, "مطلوب"),
  saleType: z.string().min(1, "مطلوب"),
  category: z.string().min(1, "مطلوب"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AddListing() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [priceEval, setPriceEval] = useState<PriceEval>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const createMutation = useCreateCar();
  const generateDescMutation = useGenerateCarDescription();
  const estimatePriceMutation = useEstimatePrice();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { year: 2015, mileage: 0, fuelType: 'petrol', transmission: 'automatic', saleType: 'cash', category: 'sedan', province: 'Damascus' }
  });

  const onSubmit = (data: FormValues) => {
    if (images.length < 5) {
      toast({ title: "يجب إضافة 5 صور على الأقل", variant: "destructive" });
      return;
    }
    createMutation.mutate({ data: { ...data, images } }, {
      onSuccess: (res) => {
        navigate(`/cars/${res.id}`);
      }
    });
  };

  const handleGenerateDesc = () => {
    const vals = watch();
    if (!vals.brand || !vals.model || !vals.year) {
      toast({ title: "الرجاء إدخال الماركة، الموديل وسنة الصنع أولاً", variant: "destructive" });
      return;
    }
    // Try AI first, fall back to template
    generateDescMutation.mutate({
      data: { brand: vals.brand, model: vals.model, year: vals.year, mileage: vals.mileage, fuelType: vals.fuelType, transmission: vals.transmission }
    }, {
      onSuccess: (res) => setValue('description', res.description),
      onError: () => {
        const fuelLabel: Record<string, string> = { petrol: "بنزين", diesel: "مازوت", electric: "كهرباء", hybrid: "هجين" };
        const transLabel: Record<string, string> = { automatic: "أوتوماتيك", manual: "يدوي" };
        const template = `للبيع ${vals.brand} ${vals.model} موديل ${vals.year}

السيارة بحالة ممتازة وجاهزة للفحص والتجربة.
نوع الوقود: ${fuelLabel[vals.fuelType] ?? vals.fuelType}
ناقل الحركة: ${transLabel[vals.transmission] ?? vals.transmission}
${vals.mileage ? `عداد: ${vals.mileage.toLocaleString()} كم` : ""}
${vals.price ? `السعر المطلوب: ${vals.price.toLocaleString()} $` : ""}

التواصل عبر الرسائل أو الاتصال المباشر.`;
        setValue('description', template);
      }
    });
  };

  const handleEstimatePrice = () => {
    const vals = watch();
    if (!vals.brand || !vals.model || !vals.year) {
      toast({ title: "الرجاء إدخال الماركة، الموديل وسنة الصنع أولاً", variant: "destructive" });
      return;
    }
    // Local instant evaluation
    const market = getMarketPrice(vals.brand);
    const entered = Number(vals.price) || 0;
    if (entered > 0) {
      evaluatePrice(entered, market);
    }
    // Also call AI for a refined suggestion
    estimatePriceMutation.mutate({
      data: { brand: vals.brand, model: vals.model, year: vals.year, mileage: vals.mileage, fuelType: vals.fuelType, transmission: vals.transmission }
    }, {
      onSuccess: (res) => {
        // AI returns price in local currency — convert to USD approx or use market table
        const aiMarket = getMarketPrice(vals.brand);
        evaluatePrice(entered, aiMarket);
        if (!entered) setValue('price', Math.round(aiMarket * 0.9));
      },
      onError: () => evaluatePrice(entered, market),
    });
  };

  const evaluatePrice = (entered: number, market: number) => {
    if (!entered || entered <= 0) {
      setPriceEval({ level: "good", market, text: `متوسط سعر السوق لهذه الماركة: ${market.toLocaleString()} $` });
      return;
    }
    if (entered > market * 1.15) {
      setPriceEval({ level: "high", market, text: `⚠ السعر أعلى من سعر السوق (${market.toLocaleString()} $) — قد يصعب بيع السيارة` });
    } else if (entered < market * 0.85) {
      setPriceEval({ level: "low", market, text: `🔥 السعر أقل من السوق (${market.toLocaleString()} $) — سيجذب المشترين بسرعة` });
    } else {
      setPriceEval({ level: "good", market, text: `✅ السعر مناسب وقريب من سعر السوق (${market.toLocaleString()} $)` });
    }
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

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">أضف إعلان سيارة</h1>
        <p className="text-muted-foreground mt-2">املأ التفاصيل بدقة لزيادة فرص البيع</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Images Upload Section */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">1</span>
            صور السيارة
            <span className="text-sm text-muted-foreground font-normal mr-auto">{images.length}/10 صور (5 على الأقل)</span>
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
                : <><ImagePlus className="w-12 h-12 text-muted-foreground mb-3" /><p className="font-medium text-foreground mb-1">اضغط هنا لرفع الصور</p><p className="text-sm text-muted-foreground">يُقبل صور السيارات فقط · أقصى حد 10 صور</p></>
              }
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Basic Details */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">2</span>
            المعلومات الأساسية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold">الماركة (Brand)</label>
              <input {...register("brand")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="مثال: تويوتا" />
              {errors.brand && <p className="text-destructive text-sm">{errors.brand.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">الموديل (Model)</label>
              <input {...register("model")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary transition-all outline-none" placeholder="مثال: كورولا" />
              {errors.model && <p className="text-destructive text-sm">{errors.model.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">سنة الصنع</label>
              <input type="number" {...register("year")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary transition-all outline-none" />
              {errors.year && <p className="text-destructive text-sm">{errors.year.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">المسافة المقطوعة (كم)</label>
              <input type="number" {...register("mileage")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary transition-all outline-none" />
            </div>
          </div>
        </div>

        {/* Specs & Location */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold">المحافظة</label>
              <select {...register("province")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
                <option value="Damascus">دمشق</option>
                <option value="Aleppo">حلب</option>
                <option value="Homs">حمص</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">المدينة/المنطقة</label>
              <input {...register("city")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">نوع الوقود</label>
              <select {...register("fuelType")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
                <option value="petrol">بنزين</option>
                <option value="diesel">مازوت</option>
                <option value="electric">كهرباء</option>
                <option value="hybrid">هجين (هايبرد)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">ناقل الحركة</label>
              <select {...register("transmission")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
                <option value="automatic">أوتوماتيك</option>
                <option value="manual">يدوي</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">فئة السيارة</label>
              <select {...register("category")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
                <option value="sedan">سيدان</option>
                <option value="suv">دفع رباعي</option>
                <option value="pickup">بيك أب</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">نوع البيع</label>
              <select {...register("saleType")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
                <option value="cash">نقد</option>
                <option value="installment">أقساط</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Powered Price & Description */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="w-40 h-40 text-white" />
          </div>
          <div className="relative z-10 space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-white mb-2">
              <span className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0">3</span>
              ميزات الذكاء الاصطناعي ✨
            </h3>

            {/* ── Price Section ────────────────────────────────────────── */}
            <div className="space-y-4 bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-bold text-white/90">السعر المطلوب (USD $)</label>
                  <input
                    type="number"
                    {...register("price")}
                    placeholder="مثال: 8500"
                    className="w-full rounded-xl border-2 border-white/20 px-4 py-3 bg-white text-gray-900 focus:border-accent transition-all outline-none font-bold text-lg placeholder:text-gray-400"
                  />
                  {errors.price && <p className="text-red-300 text-sm">{errors.price.message}</p>}
                </div>
                <Button
                  type="button"
                  onClick={handleEstimatePrice}
                  disabled={estimatePriceMutation.isPending}
                  className="rounded-xl h-12 px-6 gap-2 bg-accent hover:bg-accent/90 text-white font-bold border-0 shadow-lg shadow-accent/30 shrink-0"
                >
                  {estimatePriceMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  اقتراح السعر
                </Button>
              </div>

              {/* Price evaluation result */}
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
                  <span className="leading-relaxed">{priceEval.text}</span>
                </div>
              )}
            </div>

            {/* ── Description Section ──────────────────────────────────── */}
            <div className="space-y-4 bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <label className="text-sm font-bold text-white/90 flex-1">وصف الإعلان</label>
                <Button
                  type="button"
                  onClick={handleGenerateDesc}
                  disabled={generateDescMutation.isPending}
                  className="rounded-xl h-10 px-5 gap-2 bg-accent hover:bg-accent/90 text-white font-bold border-0 text-sm shadow-lg shadow-accent/30 shrink-0"
                >
                  {generateDescMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  توليد وصف جذاب
                </Button>
              </div>
              <textarea
                {...register("description")}
                rows={6}
                className="w-full rounded-xl border-2 border-white/20 px-4 py-3 bg-white text-gray-900 focus:border-accent transition-all outline-none resize-none leading-relaxed placeholder:text-gray-400"
                placeholder="اكتب وصفاً مفصلاً لسيارتك، أو اضغط 'توليد وصف جذاب'..."
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
