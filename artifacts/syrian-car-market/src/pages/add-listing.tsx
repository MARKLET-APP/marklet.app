// UI_ID: POST_01
// NAME: نشر إعلان
import { useState, useRef, useCallback } from "react";
import { useCreateCar, useGenerateCarDescription } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { Button } from "@/components/ui/button";
import { Sparkles, ImagePlus, Loader2, CheckCircle2, X, ShieldCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import { api } from "@/lib/api";
import { SYRIAN_PROVINCES } from "@/lib/constants";

// ── Market base prices (USD) per car brand ──────────────────────────────────
const MARKET_PRICES: Record<string, number> = {
  toyota: 13000, hyundai: 9500, kia: 9000, nissan: 11000,
  honda: 11500, mazda: 10000, mitsubishi: 9500, suzuki: 7500,
  mercedes: 28000, bmw: 30000, audi: 26000, volkswagen: 17000,
  ford: 15000, chevrolet: 13000, peugeot: 9500, renault: 8500,
  lada: 4500, chery: 7000, geely: 7500, haval: 11000,
  byd: 12000, mg: 9500,
};

// ── Market base prices (USD) per motorcycle brand ───────────────────────────
const MOTO_PRICES: Record<string, number> = {
  yamaha: 2800, honda: 2600, suzuki: 2400, kawasaki: 3000, ktm: 4500,
  bmw: 9000, ducati: 10000, harley: 8000, triumph: 7000, royal: 5000,
  tvs: 1500, bajaj: 1200, lifan: 900, zongshen: 1000, loncin: 950,
  shineray: 1100, dayun: 1000, cfmoto: 3500, benelli: 2800, sym: 1800,
};

function estimateMotoPrice(brand: string, year: number, similarPrices: number[]): number {
  const base = MOTO_PRICES[brand.toLowerCase().trim()] ?? 2000;
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  const ageDepreciation = Math.min(age * 0.08, 0.65);
  let estimated = Math.round(base * (1 - ageDepreciation));
  if (similarPrices.length > 0) {
    const avg = similarPrices.reduce((a, b) => a + b, 0) / similarPrices.length;
    estimated = Math.round((estimated + avg) / 2);
  }
  return Math.max(estimated, 200);
}

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

type ListingType = "car_sale" | "motorcycles" | "car_rent" | "car_parts" | "real_estate" | "jobs";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("scm_token");
  const res = await fetch(withApi("/api/upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { image?: string; url?: string; error?: string; success?: boolean; message?: string };
  if (!res.ok) throw new Error(data.error ?? "فشل رفع الصورة");
  return (data.image ?? data.url)!;
}

const DRAFT_KEY = "lazemni_listing_draft";

const DEFAULT_FIELDS = {
  brand: "", model: "", year: "2015", price: "", mileage: "0",
  fuelType: "petrol", transmission: "automatic", province: "دمشق",
  city: "", saleType: "cash", condition: "used", category: "sedan", description: "",
  engineCC: "", bikeType: "", dailyPrice: "", weeklyPrice: "",
  rentalDuration: "", partType: "", partCarModel: "", partCarYear: "",
  // Real Estate fields
  reTitle: "", reListingType: "بيع", reSubCategory: "شقق",
  rePrice: "", reArea: "", reRooms: "", reBathrooms: "", reFloor: "",
  reProvince: "دمشق", reCity: "", reLocation: "", rePhone: "",
  // Jobs fields
  jobTitle: "", jobSubCategory: "وظيفة شاغرة", jobCompany: "", jobSalary: "",
  jobType: "دوام كامل", jobExperience: "بدون خبرة", jobField: "أخرى",
  jobProvince: "دمشق", jobCity: "", jobPhone: "", jobRequirements: "",
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { fields: typeof DEFAULT_FIELDS; listingType: ListingType };
  } catch { return null; }
}

export default function AddListing() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0); // صور قيد الرفع الآن
  const [priceEval, setPriceEval] = useState<PriceEval>(null);
  const [estimating, setEstimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft on mount
  const draft = loadDraft();
  const [listingType, setListingType] = useState<ListingType>(draft?.listingType ?? "car_sale");
  const [fields, setFields] = useState(draft?.fields ?? { ...DEFAULT_FIELDS });
  const [resetKey, setResetKey] = useState(0);

  // ── Stable ref mirrors ──────────────────────────────────────────────────
  // fieldsRef always holds the LATEST fields synchronously — used inside
  // handleField so we can build the updated object and save to localStorage
  // in the same call without waiting for the next render cycle.
  // This prevents the "lost keystroke on remount" race on Android WebView.
  const fieldsRef = useRef(fields);
  const listingTypeRef = useRef(listingType);

  // ── IME composition tracking ─────────────────────────────────────────────
  // On Android WebView, Arabic/RTL text is entered via IME (Input Method Engine).
  // IME fires compositionstart → many compositionupdate → compositionend.
  // If React re-renders during composition (due to setState), it overwrites the
  // input DOM value and KILLS the composed text → Arabic characters disappear.
  // Fix: block setState while IME is composing. Only commit to React state after
  // compositionend (or immediately for Latin/numeric inputs that never compose).
  const composingRef = useRef(false);

  // Auto-save helper — write to localStorage directly (no side-effects)
  const saveDraft = useCallback((f: typeof DEFAULT_FIELDS, lt: ListingType) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ fields: f, listingType: lt }));
    } catch {}
  }, []);

  // For SELECT elements only — must stay controlled for instant re-render.
  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const name = e.target.name;
    const value = e.target.value;
    const next = { ...fieldsRef.current, [name]: value };
    fieldsRef.current = next;
    saveDraft(next, listingTypeRef.current);
    if (name === "price") setPriceEval(null);
    setFields(next);
  };

  // For TEXT inputs / textareas — update ref + localStorage only.
  // No React setState → no re-render → Android IME composition never broken.
  // React state is synced via onBlur (handleBlur) when the field loses focus.
  const handleFieldRaw = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const name = target.name;
    const value = target.value;
    const next = { ...fieldsRef.current, [name]: value };
    fieldsRef.current = next;
    saveDraft(next, listingTypeRef.current);
    if (name === "price") setPriceEval(null);
  };

  // IME composition handlers — attach to every text input
  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((
    e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    composingRef.current = false;
    // Commit the fully composed text to React state now that IME is done
    const name = (e.target as HTMLInputElement).name;
    const value = (e.target as HTMLInputElement).value;
    const next = { ...fieldsRef.current, [name]: value };
    fieldsRef.current = next;
    setFields(next);
    saveDraft(next, listingTypeRef.current);
  }, [saveDraft]);

  // Safety net: some Android keyboards never fire compositionend when the user
  // taps another field — blur is always fired so we use it to flush any pending
  // IME composition into React state before the field loses focus.
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // Always flush — whether composing or not — so the latest DOM value is
    // in React state even if compositionend was missed by the browser.
    const name = e.target.name;
    const value = e.target.value;
    if (!name) return;
    composingRef.current = false;
    const next = { ...fieldsRef.current, [name]: value };
    fieldsRef.current = next;
    setFields(next);
    saveDraft(next, listingTypeRef.current);
  }, [saveDraft]);

  // Keep listingTypeRef in sync and persist on type change
  const handleListingType = useCallback((lt: ListingType) => {
    listingTypeRef.current = lt;
    setListingType(lt);
    saveDraft(fieldsRef.current, lt);
  }, [saveDraft]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 10) {
      showToast("الحد الأقصى 10 صور", { variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setPendingUploads(files.length); // أظهر كل المؤشرات فوراً
    let remaining = files.length;
    for (const file of files) {
      try {
        const url = await uploadImage(file);
        setImages(prev => [...prev, url]);
      } catch (err: any) {
        showToast(err.message ?? "فشل رفع الصورة", { variant: "destructive" });
      } finally {
        remaining -= 1;
        setPendingUploads(remaining); // خفّض المؤشرات تدريجياً مع انتهاء كل صورة
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
    const f = fieldsRef.current;
    const isMoto = listingType === "motorcycles";
    const isRent = listingType === "car_rent";
    const modelVal = isMoto ? (f.bikeType || f.model) : f.model;
    if (!f.brand || (!isMoto && !isRent && !modelVal) || !f.year) {
      showToast("الرجاء إدخال الماركة، الموديل وسنة الصنع أولاً", { variant: "destructive" });
      return;
    }
    generateDescMutation.mutate({
      data: {
        brand: f.brand,
        model: isMoto ? modelVal : (isRent ? (f.model || f.brand) : modelVal),
        year: Number(f.year),
        mileage: isMoto ? 0 : Number(f.mileage),
        fuelType: isMoto ? "petrol" : f.fuelType,
        transmission: isMoto ? "manual" : f.transmission,
      }
    }, {
      onSuccess: (res) => {
        const next = { ...fieldsRef.current, description: res.description };
        fieldsRef.current = next;
        setFields(next);
        saveDraft(next, listingTypeRef.current);
      },
      onError: () => {
        const template = isMoto
          ? `للبيع دراجة نارية ${fields.brand} ${fields.model} موديل ${fields.year}

الدراجة بحالة ممتازة وجاهزة للتجربة والفحص.
${fields.bikeType ? `النوع: ${fields.bikeType}` : ""}
${fields.engineCC ? `حجم المحرك: ${fields.engineCC} cc` : ""}
${fields.price ? `السعر المطلوب: ${Number(fields.price).toLocaleString()} $` : ""}

للتواصل والاستفسار عبر الرسائل أو الاتصال المباشر.`
          : `للبيع ${fields.brand} ${fields.model} موديل ${fields.year}

السيارة بحالة ممتازة وجاهزة للفحص والتجربة.
نوع الوقود: ${{ petrol: "بنزين", diesel: "مازوت", electric: "كهرباء", hybrid: "هجين" }[fields.fuelType] ?? fields.fuelType}
ناقل الحركة: ${{ automatic: "أوتوماتيك", manual: "يدوي" }[fields.transmission] ?? fields.transmission}
${fields.mileage ? `عداد: ${Number(fields.mileage).toLocaleString()} كم` : ""}
${fields.price ? `السعر المطلوب: ${Number(fields.price).toLocaleString()} $` : ""}

التواصل عبر الرسائل أو الاتصال المباشر.`;
        const next = { ...fieldsRef.current, description: template };
        fieldsRef.current = next;
        setFields(next);
        saveDraft(next, listingTypeRef.current);
      }
    });
  };

  const handleEstimatePrice = async () => {
    const f = fieldsRef.current;
    if (!f.brand || !f.year) {
      showToast("الرجاء إدخال الماركة وسنة الصنع أولاً", { variant: "destructive" });
      return;
    }
    setEstimating(true);
    try {
      const year = Number(f.year) || 2015;
      const mileage = Number(f.mileage) || 0;
      const entered = Number(f.price) || 0;

      const cars = (allCarsData?.cars ?? []) as any[];
      const isMoto = listingType === "motorcycles";

      const similar = cars.filter((c: any) => {
        const brandMatch = c.brand?.toLowerCase() === f.brand.toLowerCase();
        const yearMatch = Math.abs((c.year ?? 0) - year) <= 3;
        const catMatch = isMoto ? c.category === "motorcycle" : c.category !== "motorcycle";
        return brandMatch && yearMatch && catMatch && c.price > 0;
      });
      const similarPrices = similar.map((c: any) => Number(c.price)).filter(Boolean);

      const estimated = isMoto
        ? estimateMotoPrice(f.brand, year, similarPrices)
        : estimateCarPrice(f.brand, year, mileage, similarPrices);

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
        const pNext = { ...fieldsRef.current, price: String(suggested) };
        fieldsRef.current = pNext;
        setFields(pNext);
        saveDraft(pNext, listingTypeRef.current);
      }
      if (similar.length > 0) {
        showToast(`تم تحليل ${similar.length} إعلان مشابه`, { description: "تم تحديث تقييم السعر" });
      }
    } finally {
      setEstimating(false);
    }
  };

  const [submittingOther, setSubmittingOther] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Always read from ref — covers uncontrolled inputs the user never blurred
    const fields = fieldsRef.current;

    // ── Real Estate submission ──────────────────────────────────────────
    if (listingType === "real_estate") {
      if (!fields.reTitle.trim()) {
        showToast("يجب إدخال عنوان الإعلان", { variant: "destructive" });
        return;
      }
      setSubmittingOther(true);
      try {
        await api.realEstate.create({
          title: fields.reTitle,
          listingType: fields.reListingType,
          subCategory: fields.reSubCategory,
          price: fields.rePrice ? Number(fields.rePrice) : null,
          area: fields.reArea ? Number(fields.reArea) : null,
          rooms: fields.reRooms ? Number(fields.reRooms) : null,
          bathrooms: fields.reBathrooms ? Number(fields.reBathrooms) : null,
          floor: fields.reFloor ? Number(fields.reFloor) : null,
          province: fields.reProvince,
          city: fields.reCity,
          location: fields.reLocation,
          phone: fields.rePhone,
          description: fields.description,
          images,
        });
        localStorage.removeItem(DRAFT_KEY);
        showToast("✅ تم إرسال إعلانك للمراجعة", { description: "سيظهر في القائمة بعد موافقة الإدارة" });
        setTimeout(() => navigate("/"), 1200);
      } catch (err: any) {
        showToast(err.message ?? "حدث خطأ", { variant: "destructive" });
      } finally {
        setSubmittingOther(false);
      }
      return;
    }

    // ── Jobs submission ─────────────────────────────────────────────────
    if (listingType === "jobs") {
      if (!fields.jobTitle.trim()) {
        showToast("يجب إدخال عنوان الوظيفة", { variant: "destructive" });
        return;
      }
      setSubmittingOther(true);
      try {
        await api.jobs.create({
          title: fields.jobTitle,
          subCategory: fields.jobSubCategory,
          company: fields.jobCompany,
          salary: fields.jobSalary ? Number(fields.jobSalary) : null,
          jobType: fields.jobType,
          experience: fields.jobExperience,
          field: fields.jobField,
          province: fields.jobProvince,
          city: fields.jobCity || undefined,
          phone: fields.jobPhone,
          description: fields.description,
          requirements: fields.jobRequirements,
        });
        localStorage.removeItem(DRAFT_KEY);
        showToast("✅ تم إرسال إعلانك للمراجعة", { description: "سيظهر في القائمة بعد موافقة الإدارة", duration: 4000 });
        setTimeout(() => navigate("/"), 2500);
      } catch (err: any) {
        showToast(err.message ?? "حدث خطأ", { variant: "destructive" });
      } finally {
        setSubmittingOther(false);
      }
      return;
    }

    // ── Vehicle submission (existing logic) ─────────────────────────────
    if (images.length < 1) {
      showToast("يجب إضافة صورة واحدة على الأقل", { variant: "destructive" });
      return;
    }

    const price = Number(fields.price);
    if (!price || price <= 0) {
      showToast("الرجاء إدخال سعر صحيح", { variant: "destructive" });
      return;
    }

    let data: Record<string, any>;
    if (listingType === "car_sale") {
      data = {
        brand: fields.brand, model: fields.model, year: Number(fields.year),
        price, mileage: Number(fields.mileage), fuelType: fields.fuelType,
        transmission: fields.transmission, province: fields.province,
        city: fields.city, saleType: fields.saleType, condition: fields.condition,
        category: fields.category, description: fields.description, images,
        listingType: "car_sale",
      };
    } else if (listingType === "motorcycles") {
      data = {
        brand: fields.brand, model: fields.model, year: Number(fields.year),
        price, category: "motorcycle", description: fields.description,
        province: fields.province, city: fields.city, saleType: fields.saleType,
        condition: fields.condition,
        fuelType: "petrol", transmission: "manual", mileage: 0,
        images, listingType: "motorcycles",
      };
    } else if (listingType === "car_rent") {
      data = {
        brand: fields.brand, model: fields.model, year: Number(fields.year),
        price: Number(fields.dailyPrice) || price, category: "rental",
        saleType: "rental", province: fields.province, city: fields.city,
        description: fields.description, fuelType: "petrol", transmission: "automatic",
        mileage: 0, images, listingType: "car_rent",
      };
    } else {
      data = {
        brand: fields.partCarModel || fields.brand, model: fields.partType,
        year: Number(fields.partCarYear) || Number(fields.year),
        price, category: "parts", saleType: "cash",
        province: fields.province, city: fields.city,
        description: fields.description, fuelType: "petrol", transmission: "manual",
        mileage: 0, images, listingType: "car_parts",
      };
    }

    createMutation.mutate({ data } as any, {
      onSuccess: () => {
        localStorage.removeItem(DRAFT_KEY);
        showToast("✅ تم إرسال إعلانك للمراجعة", { description: "سيظهر في القائمة بعد موافقة الإدارة" });
        setTimeout(() => navigate("/"), 1200);
      },
      onError: (err: any) => showToast(err.message ?? "حدث خطأ", { variant: "destructive" }),
    });
  };

  const [activating, setActivating] = useState(false);

  const activateSellerMode = async (newRole: "seller" | "dealer") => {
    if (!user) { navigate("/login"); return; }
    setActivating(true);
    try {
      const token = localStorage.getItem("scm_token");
      const res = await fetch(withApi(`/api/users/${user.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      useAuthStore.getState().setAuth(updated, token!);
      showToast("تم تفعيل وضع البائع", { description: "يمكنك الآن نشر إعلاناتك" });
    } catch {
      showToast("حدث خطأ أثناء تغيير الوضع", { variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center px-4">
        <div className="max-w-md mx-auto bg-card p-8 rounded-3xl border shadow-lg">
          <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">يجب تسجيل الدخول أولاً</h2>
          <p className="text-muted-foreground mb-6">قم بتسجيل الدخول لتتمكن من نشر إعلانك.</p>
          <Button onClick={() => navigate('/login')} className="w-full rounded-xl">تسجيل الدخول</Button>
        </div>
      </div>
    );
  }

  if (user?.role !== 'seller' && user?.role !== 'dealer' && user?.role !== 'admin') {
    return (
      <div className="py-20 text-center px-4">
        <div className="max-w-md mx-auto bg-card p-8 rounded-3xl border shadow-lg space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">فعّل وضع البائع</h2>
            <p className="text-muted-foreground text-sm">لنشر إعلانك، اختر وضع الحساب المناسب. يمكنك التبديل بين الأوضاع في أي وقت من إعدادات حسابك.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => activateSellerMode("seller")}
              disabled={activating}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <span className="text-2xl">🚗</span>
              <span className="font-bold text-primary text-sm">بائع سيارات</span>
              <span className="text-xs text-muted-foreground">أفراد</span>
            </button>
            <button
              onClick={() => activateSellerMode("dealer")}
              disabled={activating}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-accent bg-accent/5 hover:bg-accent/10 transition-colors"
            >
              <span className="text-2xl">🏢</span>
              <span className="font-bold text-accent text-sm">تاجر / معرض</span>
              <span className="text-xs text-muted-foreground">شركات</span>
            </button>
          </div>
          {activating && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <button
            onClick={() => navigate('/buy-requests')}
            className="w-full text-sm text-muted-foreground hover:text-foreground underline"
          >
            أريد الشراء فقط ← اذهب إلى طلبات الشراء
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none";
  const selectCls = `${inputCls}`;

  // Spread these on every <input> and <textarea> that can receive Arabic text.
  // onCompositionStart / onCompositionEnd bracket the IME composition window so
  // React does NOT re-render mid-composition and break Arabic characters.
  // onBlur is the safety net: if compositionend never fires (some Android keyboards),
  // blur always fires and flushes the pending Arabic text into React state.
  const imeProps = {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd as React.CompositionEventHandler<any>,
    onBlur: handleBlur as React.FocusEventHandler<any>,
    dir: "auto" as const,
  };

  // Show the draft badge only when the user has typed meaningful data
  // (brand, model, price, or description are non-empty).
  // This prevents the badge from appearing on a fresh page or right after clearing.
  const hasDraft = !!(fields.brand || fields.model || fields.price || fields.description || fields.partType);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    const reset = { ...DEFAULT_FIELDS };
    fieldsRef.current = reset;
    listingTypeRef.current = "car_sale";
    setFields(reset);
    setListingType("car_sale");
    setImages([]);
    setPriceEval(null);
    setResetKey(k => k + 1); // Remount all uncontrolled inputs with fresh defaultValues
  };

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">نشر إعلان بيع</h1>
          <p className="text-muted-foreground mt-1 text-sm">اختر نوع الإعلان وأدخل التفاصيل لزيادة فرص البيع</p>
        </div>
        {hasDraft && (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>مسودة محفوظة تلقائياً</span>
            <button type="button" onClick={clearDraft} className="underline text-destructive hover:no-underline mr-1">مسح</button>
          </div>
        )}
      </div>

      <form key={resetKey} onSubmit={handleSubmit} className="space-y-8" autoComplete="off" data-form-type="other">

        {/* ── Step 0: Listing Type ── */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">1</span>
            نوع الإعلان
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { value: "car_sale",   label: "🚗 سيارة" },
              { value: "motorcycles",label: "🏍️ دراجة نارية" },
              { value: "car_rent",   label: "🔑 تأجير" },
              { value: "car_parts",  label: "🔧 قطع غيار" },
              { value: "real_estate",label: "🏠 عقارات" },
              { value: "jobs",       label: "💼 وظائف" },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleListingType(opt.value)}
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

          {(images.length > 0 || pendingUploads > 0) && (
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
              {/* مؤشر تحميل لكل صورة قيد الرفع */}
              {Array.from({ length: pendingUploads }).map((_, i) => (
                <div key={`pending-${i}`}
                  className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  <span className="text-[10px] text-primary/70 font-medium">جارٍ الرفع...</span>
                </div>
              ))}
              {images.length + pendingUploads < 10 && (
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

          {images.length === 0 && pendingUploads === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-secondary/20 transition-colors disabled:opacity-50"
            >
              <ImagePlus className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground mb-1">اضغط هنا لرفع الصور</p>
              <p className="text-sm text-muted-foreground">أقصى حد 10 صور</p>
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} tabIndex={-1} onChange={handleFileChange} />
        </div>

        {/* ── Step 2: Dynamic Fields ── */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">3</span>
            المعلومات الأساسية
          </h3>

          {/* CAR fields */}
          {listingType === "car_sale" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">الشركة (Brand)</label>
                <input name="brand" defaultValue={fields.brand} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: تويوتا" required autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الموديل (Model)</label>
                <input name="model" defaultValue={fields.model} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: كورولا" required autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سنة الصنع</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="year" defaultValue={fields.year} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 2015" required autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">عدد الكيلومترات</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="mileage" defaultValue={fields.mileage} onInput={handleFieldRaw} className={inputCls} placeholder="0" autoComplete="off" />
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
          {listingType === "motorcycles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">الشركة</label>
                <input name="brand" defaultValue={fields.brand} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: هوندا" required autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سعة المحرك (CC)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="engineCC" defaultValue={fields.engineCC} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 125" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سنة الصنع</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="year" defaultValue={fields.year} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 2015" required autoComplete="off" />
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
          {listingType === "car_rent" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع السيارة</label>
                <input name="brand" defaultValue={fields.brand} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: تويوتا كامري" required autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الموديل</label>
                <input name="model" defaultValue={fields.model} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: 2022" autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">السعر اليومي (USD)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="dailyPrice" defaultValue={fields.dailyPrice} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 30" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">السعر الأسبوعي (USD)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="weeklyPrice" defaultValue={fields.weeklyPrice} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 180" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المدينة</label>
                <input name="city" defaultValue={fields.city} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="دمشق" required />
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
          {listingType === "car_parts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع القطعة</label>
                <input name="partType" defaultValue={fields.partType} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: محرك، ناقل حركة، صدام..." required autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع السيارة</label>
                <input name="brand" defaultValue={fields.brand} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: تويوتا" autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">موديل السيارة</label>
                <input name="partCarModel" defaultValue={fields.partCarModel} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: كامري" autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سنة السيارة</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="partCarYear" defaultValue={fields.partCarYear} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 2015" autoComplete="off" />
              </div>
            </div>
          )}

          {/* REAL ESTATE fields */}
          {listingType === "real_estate" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold">عنوان الإعلان</label>
                <input name="reTitle" defaultValue={fields.reTitle} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: شقة فاخرة للبيع في مزة فيلات" required autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع الإعلان</label>
                <select name="reListingType" value={fields.reListingType} onChange={handleField} className={selectCls}>
                  <option value="بيع">للبيع</option>
                  <option value="إيجار">للإيجار</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع العقار</label>
                <select name="reSubCategory" value={fields.reSubCategory} onChange={handleField} className={selectCls}>
                  <option value="شقق">شقة</option>
                  <option value="منازل وفيلات">منزل / فيلا</option>
                  <option value="استديو">استوديو</option>
                  <option value="غرفة">غرفة</option>
                  <option value="أراضي">أرض</option>
                  <option value="مكاتب">مكتب</option>
                  <option value="محلات تجارية">محل تجاري</option>
                  <option value="مستودعات">مستودع</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">السعر (USD $)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="rePrice" defaultValue={fields.rePrice} onInput={handleFieldRaw} className={inputCls} placeholder="0" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المساحة (م²)</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="reArea" defaultValue={fields.reArea} onInput={handleFieldRaw} className={inputCls} placeholder="120" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">عدد الغرف</label>
                <select name="reRooms" value={fields.reRooms} onChange={handleField} className={selectCls}>
                  <option value="">غير محدد</option>
                  <option value="1">1</option><option value="2">2</option>
                  <option value="3">3</option><option value="4">4</option>
                  <option value="5">5</option><option value="6">6+</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">عدد الحمامات</label>
                <select name="reBathrooms" value={fields.reBathrooms} onChange={handleField} className={selectCls}>
                  <option value="">غير محدد</option>
                  <option value="1">1</option><option value="2">2</option>
                  <option value="3">3</option><option value="4">4+</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الطابق</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="reFloor" defaultValue={fields.reFloor} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 3" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المحافظة</label>
                <select name="reProvince" value={fields.reProvince} onChange={handleField} className={selectCls}>
                  {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المنطقة / الحي</label>
                <input name="reCity" defaultValue={fields.reCity} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: مزة فيلات، أبو رمانة..." autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold">موقع العقار (رابط خريطة اختياري)</label>
                <input name="reLocation" defaultValue={fields.reLocation} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="https://maps.google.com/..." autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">رقم الهاتف / واتساب</label>
                <input type="tel" name="rePhone" defaultValue={fields.rePhone} onInput={handleFieldRaw} className={inputCls} placeholder="09XXXXXXXX" dir="ltr" autoComplete="off" />
              </div>
            </div>
          )}

          {/* JOBS fields */}
          {listingType === "jobs" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold">المسمى الوظيفي</label>
                <input name="jobTitle" defaultValue={fields.jobTitle} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: مطلوب مهندس برمجيات" required autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع الإعلان</label>
                <select name="jobSubCategory" value={fields.jobSubCategory} onChange={handleField} className={selectCls}>
                  <option value="وظيفة شاغرة">وظيفة شاغرة</option>
                  <option value="طلب توظيف">طلب توظيف</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المجال</label>
                <select name="jobField" value={fields.jobField} onChange={handleField} className={selectCls}>
                  <option value="تقنية المعلومات">تقنية المعلومات</option>
                  <option value="هندسة">هندسة</option>
                  <option value="طب وصحة">طب وصحة</option>
                  <option value="تعليم">تعليم</option>
                  <option value="تجارة ومبيعات">تجارة ومبيعات</option>
                  <option value="مالية ومحاسبة">مالية ومحاسبة</option>
                  <option value="تصميم وفنون">تصميم وفنون</option>
                  <option value="قانون">قانون</option>
                  <option value="إعلام وصحافة">إعلام وصحافة</option>
                  <option value="خدمة عملاء">خدمة عملاء</option>
                  <option value="بناء وعقارات">بناء وعقارات</option>
                  <option value="نقل ولوجستيك">نقل ولوجستيك</option>
                  <option value="زراعة">زراعة</option>
                  <option value="سياحة وفنادق">سياحة وفنادق</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">نوع العقد</label>
                <select name="jobType" value={fields.jobType} onChange={handleField} className={selectCls}>
                  <option value="دوام كامل">دوام كامل</option>
                  <option value="دوام جزئي">دوام جزئي</option>
                  <option value="عن بعد">عن بعد</option>
                  <option value="عقد مؤقت">عقد مؤقت</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الخبرة المطلوبة</label>
                <select name="jobExperience" value={fields.jobExperience} onChange={handleField} className={selectCls}>
                  <option value="بدون خبرة">بدون خبرة</option>
                  <option value="أقل من سنة">أقل من سنة</option>
                  <option value="1-3 سنوات">1-3 سنوات</option>
                  <option value="3-5 سنوات">3-5 سنوات</option>
                  <option value="أكثر من 5 سنوات">أكثر من 5 سنوات</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الراتب (USD $) - اختياري</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" name="jobSalary" defaultValue={fields.jobSalary} onInput={handleFieldRaw} className={inputCls} placeholder="مثال: 500" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">اسم الشركة / صاحب العمل</label>
                <input name="jobCompany" defaultValue={fields.jobCompany} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="اختياري" autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المحافظة</label>
                <select name="jobProvince" value={fields.jobProvince} onChange={handleField} className={selectCls}>
                  {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المدينة / المنطقة</label>
                <input name="jobCity" defaultValue={fields.jobCity} onInput={handleFieldRaw} {...imeProps} className={inputCls} placeholder="مثال: دمشق، المزة..." autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">رقم الهاتف / واتساب</label>
                <input type="tel" name="jobPhone" defaultValue={fields.jobPhone} onInput={handleFieldRaw} className={inputCls} placeholder="09XXXXXXXX" dir="ltr" autoComplete="off" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold">المتطلبات والمؤهلات</label>
                <textarea name="jobRequirements" defaultValue={fields.jobRequirements} onInput={handleFieldRaw} onCompositionStart={handleCompositionStart} onCompositionEnd={handleCompositionEnd} onBlur={handleBlur} rows={3} className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary transition-all outline-none resize-none leading-relaxed text-sm" placeholder="مثال: بكالوريوس هندسة، خبرة في React..." />
              </div>
            </div>
          )}

          {/* Shared: Province / City / Sale Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
            {listingType !== "car_rent" && listingType !== "real_estate" && listingType !== "jobs" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold">المحافظة</label>
                  <select name="province" value={fields.province} onChange={handleField} className={selectCls}>
                    {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">المدينة/المنطقة</label>
                  <input name="city" defaultValue={fields.city} onInput={handleFieldRaw} {...imeProps} className={inputCls} />
                </div>
              </>
            )}
            {(listingType === "car_sale" || listingType === "motorcycles") && (
              <div className="space-y-2">
                <label className="text-sm font-bold">{listingType === "motorcycles" ? "حالة الدراجة" : "حالة السيارة"}</label>
                <select name="condition" value={fields.condition} onChange={handleField} className={selectCls}>
                  <option value="used">مستعملة</option>
                  <option value="new">جديدة</option>
                </select>
              </div>
            )}
            {listingType === "car_sale" && (
              <div className="space-y-2">
                <label className="text-sm font-bold">طريقة البيع</label>
                <select name="saleType" value={fields.saleType} onChange={handleField} className={selectCls}>
                  <option value="cash">نقد</option>
                  <option value="installment">أقساط</option>
                  <option value="barter">مقايضة</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 3: Description only (for Real Estate & Jobs) ── */}
        {(listingType === "real_estate" || listingType === "jobs") && (
          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">4</span>
              {listingType === "jobs" ? "وصف الوظيفة" : "وصف العقار"}
            </h3>
            <textarea
              name="description"
              defaultValue={fields.description}
              onInput={handleFieldRaw}
              onBlur={handleBlur}
              rows={6}
              className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary transition-all outline-none resize-none leading-relaxed text-sm"
              placeholder={listingType === "jobs" ? "اكتب وصفاً تفصيلياً للوظيفة، المهام، الشروط..." : "اكتب وصفاً تفصيلياً للعقار، المميزات، الخدمات القريبة..."}
            />
          </div>
        )}

        {/* ── Step 3: AI Section (cars only) ── */}
        {listingType !== "real_estate" && listingType !== "jobs" && (
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
                    {listingType === "car_rent" ? "السعر اليومي (USD $)" : "السعر المطلوب (USD $)"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="price"
                    defaultValue={fields.price}
                    onInput={handleFieldRaw}
                    onBlur={handleBlur}
                    placeholder="مثال: 8500"
                    required
                    autoComplete="off"
                    className="w-full rounded-xl border-2 border-white/20 px-4 py-3 bg-white text-gray-900 focus:border-accent transition-all outline-none font-bold text-lg placeholder:text-gray-400"
                  />
                </div>
                {(listingType === "car_sale" || listingType === "motorcycles") && (
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
                {(listingType === "car_sale" || listingType === "motorcycles" || listingType === "car_rent") && (
                  <Button
                    type="button"
                    onClick={handleGenerateDesc}
                    disabled={generateDescMutation.isPending}
                    className="rounded-xl h-10 px-5 gap-2 bg-accent hover:bg-accent/90 text-white font-bold border-0 text-sm shadow-lg shadow-accent/30 shrink-0"
                  >
                    {generateDescMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {listingType === "motorcycles" ? "توليد وصف الدراجة" : "توليد وصف جذاب"}
                  </Button>
                )}
              </div>
              <textarea
                name="description"
                defaultValue={fields.description}
                onInput={handleFieldRaw}
                onBlur={handleBlur}
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
        )}

        <Button type="submit" disabled={createMutation.isPending || submittingOther} className="w-full rounded-2xl h-14 text-lg font-bold bg-primary text-white shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all">
          {(createMutation.isPending || submittingOther) ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "نشر الإعلان"}
        </Button>
      </form>
    </div>
  );
}
