// UI_ID: BUY_REQUESTS_01
// NAME: طلبات الشراء
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/runtimeConfig";
import { useLocation } from "wouter";
import { useStartChat } from "@/hooks/use-start-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, DollarSign, Plus, Trash2, User, CreditCard, MessageCircle, Eye, Loader2, Car, Hash, Wrench, Bike } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareSheet } from "@/components/ShareSheet";

type BuyRequest = {
  id: number;
  userId: number;
  brand: string | null;
  model: string | null;
  minYear: number | null;
  maxYear: number | null;
  maxPrice: number | null;
  currency: string | null;
  city: string | null;
  paymentType: string | null;
  description: string | null;
  status: string | null;
  category: string | null;
  createdAt: string;
  userName: string | null;
  userPhoto: string | null;
};

type CarListing = {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number | null;
  city: string | null;
  primaryImage: string | null;
  sellerName: string | null;
  sellerId?: number;
  userId?: number;
  category?: string | null;
};

type JunkCar = {
  id: number;
  sellerId: number;
  type: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  city: string | null;
  images: string[] | null;
  description: string | null;
  sellerName?: string | null;
};

type Category = "car" | "motorcycle" | "junk" | "plates";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقداً",
  installment: "تقسيط",
};

const CAT_TABS: { v: Category; icon: string; label: string; sellLabel: string; sellPath: string; buyLabel: string }[] = [
  { v: "car",        icon: "🚗", label: "سيارات",  sellLabel: "نشر إعلان سيارة", sellPath: "/add-listing", buyLabel: "طلب شراء سيارة" },
  { v: "motorcycle", icon: "🏍️", label: "دراجات",  sellLabel: "نشر إعلان دراجة", sellPath: "/add-listing", buyLabel: "طلب شراء دراجة" },
  { v: "junk",       icon: "🔧", label: "خردة",    sellLabel: "نشر إعلان خردة",  sellPath: "/junk-cars",  buyLabel: "طلب شراء خردة" },
  { v: "plates",     icon: "#️⃣", label: "لوحات",   sellLabel: "نشر لوحة للبيع",  sellPath: "/plates",     buyLabel: "طلب شراء لوحة" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function BuyRequests() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [activeCat, setActiveCat] = useState<Category>("car");
  const [open, setOpen] = useState(false);
  const { startChat, loading: startingChat } = useStartChat();
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle" | "junk" | "rental">("car");
  const [form, setForm] = useState({
    brand: "", model: "", minYear: "", maxYear: "",
    maxPrice: "", city: "", paymentType: "", description: "",
    fuelType: "", transmission: "", mileage: "", condition: "",
    bikeType: "", engineCC: "", weight: "", dailyPrice: "", weeklyPrice: "", rentalDuration: "",
  });

  const activeCatDef = CAT_TABS.find(t => t.v === activeCat)!;

  const { data: allRequests = [], isLoading: loadingReqs } = useQuery<BuyRequest[]>({
    queryKey: ["buy-requests"],
    queryFn: () => api.buyRequests.list(),
  });

  const carsQueryUrl = activeCat === "motorcycle"
    ? "/api/cars?category=motorcycle&limit=20"
    : activeCat === "plates"
    ? "/api/cars?category=plates&limit=20"
    : "/api/cars?limit=20";

  const { data: carListings = [], isLoading: loadingCars } = useQuery<CarListing[]>({
    queryKey: ["sell-listings", activeCat],
    queryFn: () => api.get(carsQueryUrl).then(r => r.json()).then((d: any) => d.cars ?? d),
    enabled: activeCat !== "junk",
  });

  const { data: junkListings = [], isLoading: loadingJunk } = useQuery<JunkCar[]>({
    queryKey: ["junk-listings"],
    queryFn: () => api.get("/api/junk-cars").then(r => r.json()),
    enabled: activeCat === "junk",
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.buyRequests.create(body),
    onSuccess: (data) => {
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setOpen(false);
      setForm({ brand: "", model: "", minYear: "", maxYear: "", maxPrice: "", city: "", paymentType: "", description: "", fuelType: "", transmission: "", mileage: "", condition: "", bikeType: "", engineCC: "", weight: "", dailyPrice: "", weeklyPrice: "", rentalDuration: "" });
      queryClient.invalidateQueries({ queryKey: ["buy-requests"] });
    },
    onError: () => toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.buyRequests.delete(id),
    onSuccess: () => { toast({ title: "تم حذف الطلب" }); queryClient.invalidateQueries({ queryKey: ["buy-requests"] }); },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extras: string[] = [];
    if (vehicleType === "motorcycle") {
      if (form.bikeType) extras.push(`نوع الدراجة: ${form.bikeType}`);
      if (form.engineCC) extras.push(`سعة المحرك: ${form.engineCC} CC`);
      if (form.condition) extras.push(`الحالة: ${form.condition}`);
    } else if (vehicleType === "junk") {
      if (form.weight) extras.push(`الوزن التقريبي: ${form.weight} كغ`);
      if (form.condition) extras.push(`الحالة العامة: ${form.condition}`);
    } else if (vehicleType === "rental") {
      if (form.dailyPrice) extras.push(`السعر اليومي: ${form.dailyPrice} $`);
      if (form.weeklyPrice) extras.push(`السعر الأسبوعي: ${form.weeklyPrice} $`);
      if (form.rentalDuration) extras.push(`مدة الإيجار: ${form.rentalDuration}`);
    } else {
      if (form.fuelType) extras.push(`الوقود: ${form.fuelType}`);
      if (form.transmission) extras.push(`ناقل الحركة: ${form.transmission}`);
      if (form.mileage) extras.push(`الكيلومترات: ${form.mileage}`);
      if (form.condition) extras.push(`الحالة: ${form.condition}`);
    }
    const fullDesc = [form.description, ...extras].filter(Boolean).join(" | ");
    const catMap: Record<string, string> = { car: "car", motorcycle: "motorcycle", junk: "junk", rental: "rental" };
    createMutation.mutate({
      brand: form.brand,
      model: vehicleType === "motorcycle" ? form.bikeType || form.model : form.model,
      minYear: form.minYear ? Number(form.minYear) : undefined,
      maxYear: form.maxYear ? Number(form.maxYear) : undefined,
      maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
      city: form.city,
      paymentType: form.paymentType,
      description: fullDesc || undefined,
      category: catMap[vehicleType] ?? undefined,
    });
  };


  const filteredRequests = allRequests.filter(r => {
    if (activeCat === "car") return !r.category || r.category === "car" || r.category === "cars";
    if (activeCat === "motorcycle") return r.category === "motorcycle" || r.category === "motorcycles";
    if (activeCat === "junk") return r.category === "junk" || r.category === "scrap";
    if (activeCat === "plates") return r.category === "plates";
    return true;
  });

  const sellingsLoading = activeCat === "junk" ? loadingJunk : loadingCars;
  const rawSellings: any[] = activeCat === "junk" ? junkListings : carListings;
  const sellings = activeCat === "car"
    ? rawSellings.filter((c: any) => !["motorcycle", "plates", "rental", "parts"].includes(c.category ?? ""))
    : rawSellings;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">السوق</h1>
        <p className="text-muted-foreground mt-1">إعلانات البيع وطلبات الشراء — اختر القسم</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CAT_TABS.map(({ v, icon, label }) => (
          <button
            key={v}
            onClick={() => setActiveCat(v)}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all",
              activeCat === v
                ? "border-primary bg-primary text-white shadow-md"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      {user && (
        <div className="flex gap-3 flex-wrap">
          <Button
            className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            onClick={() => navigate(activeCatDef.sellPath)}
          >
            <Plus className="w-4 h-4" /> {activeCatDef.sellLabel}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl font-bold border-2 border-primary text-primary hover:bg-primary/5">
                <Plus className="w-4 h-4" /> {activeCatDef.buyLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">نشر طلب شراء</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">نوع المركبة *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { v: "car", icon: "🚗", label: "سيارة" },
                      { v: "motorcycle", icon: "🏍️", label: "دراجة" },
                      { v: "junk", icon: "🔧", label: "خردة" },
                      { v: "rental", icon: "🔑", label: "إيجار" },
                    ] as const).map(({ v, icon, label }) => (
                      <button key={v} type="button" onClick={() => setVehicleType(v)}
                        className={cn("flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs transition-all", vehicleType === v ? "border-primary bg-primary/10 text-primary font-bold" : "border-border hover:border-primary/40")}
                      >
                        <span className="text-lg">{icon}</span><span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {vehicleType === "car" && (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الشركة</label><Input name="brand" value={form.brand} onChange={handleChange} placeholder="Toyota" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">الموديل</label><Input name="model" value={form.model} onChange={handleChange} placeholder="كامري" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">سنة من</label><Input type="number" name="minYear" value={form.minYear} onChange={handleChange} placeholder="2010" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">سنة إلى</label><Input type="number" name="maxYear" value={form.maxYear} onChange={handleChange} placeholder="2024" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الوقود</label>
                      <select name="fuelType" value={form.fuelType} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">غير محدد</option><option value="بنزين">بنزين</option><option value="مازوت">مازوت</option><option value="كهرباء">كهرباء</option><option value="هجين">هجين</option>
                      </select></div>
                    <div className="space-y-1"><label className="text-sm font-medium">ناقل الحركة</label>
                      <select name="transmission" value={form.transmission} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">غير محدد</option><option value="أوتوماتيك">أوتوماتيك</option><option value="يدوي">يدوي</option>
                      </select></div>
                  </div>
                </>)}

                {vehicleType === "motorcycle" && (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الشركة</label><Input name="brand" value={form.brand} onChange={handleChange} placeholder="Honda, Yamaha..." /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">نوع الدراجة</label>
                      <select name="bikeType" value={form.bikeType} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">اختر</option><option value="سبورت">سبورت</option><option value="كروزر">كروزر</option><option value="سكوتر">سكوتر</option><option value="أوف رود">أوف رود</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">سعة المحرك (CC)</label><Input type="number" name="engineCC" value={form.engineCC} onChange={handleChange} placeholder="125" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">سنة الصنع</label><Input type="number" name="minYear" value={form.minYear} onChange={handleChange} placeholder="2018" /></div>
                  </div>
                </>)}

                {vehicleType === "junk" && (<>
                  <div className="space-y-1"><label className="text-sm font-medium">نوع المركبة</label><Input name="brand" value={form.brand} onChange={handleChange} placeholder="سيارة، شاحنة، باص..." /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الوزن التقريبي (كغ)</label><Input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="800" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">المدينة</label><Input name="city" value={form.city} onChange={handleChange} placeholder="دمشق" /></div>
                  </div>
                  <div className="space-y-1"><label className="text-sm font-medium">الحالة العامة</label>
                    <select name="condition" value={form.condition} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">غير محدد</option><option value="حالة جيدة">حالة جيدة</option><option value="مهشمة">مهشمة</option><option value="للقطع فقط">للقطع فقط</option>
                    </select></div>
                </>)}

                {vehicleType === "rental" && (<>
                  <div className="space-y-1"><label className="text-sm font-medium">نوع المركبة</label><Input name="brand" value={form.brand} onChange={handleChange} placeholder="سيارة، فان، شاحنة..." /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">السعر اليومي ($)</label><Input type="number" name="dailyPrice" value={form.dailyPrice} onChange={handleChange} placeholder="20" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">السعر الأسبوعي ($)</label><Input type="number" name="weeklyPrice" value={form.weeklyPrice} onChange={handleChange} placeholder="120" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">المدينة</label><Input name="city" value={form.city} onChange={handleChange} placeholder="دمشق" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">مدة الإيجار</label><Input name="rentalDuration" value={form.rentalDuration} onChange={handleChange} placeholder="أسبوع، شهر..." /></div>
                  </div>
                </>)}

                {(vehicleType === "car" || vehicleType === "motorcycle") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الحد الأقصى للسعر ($)</label>
                      <div className="relative"><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">$</span>
                        <Input type="number" name="maxPrice" value={form.maxPrice} onChange={handleChange} placeholder="5000" className="pr-8" /></div></div>
                    <div className="space-y-1"><label className="text-sm font-medium">المدينة</label><Input name="city" value={form.city} onChange={handleChange} placeholder="دمشق" /></div>
                  </div>
                )}

                {(vehicleType === "car" || vehicleType === "motorcycle") && (
                  <div className="space-y-1"><label className="text-sm font-medium">طريقة الدفع</label>
                    <select name="paymentType" value={form.paymentType} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">غير محدد</option><option value="cash">نقداً</option><option value="installment">تقسيط</option>
                    </select></div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium">تفاصيل إضافية</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="أي ملاحظات أو تفاصيل أخرى..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl font-bold">
                  {createMutation.isPending ? "جارٍ النشر..." : "نشر الطلب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ─── SELL LISTINGS SECTION ─── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground border-b pb-2">
          <span>{activeCatDef.icon}</span> إعلانات البيع — {activeCatDef.label}
        </h2>
        {sellingsLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : sellings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-2xl">
            <p className="text-lg font-bold mb-1">لا توجد إعلانات بيع في هذا القسم حالياً</p>
            {user && <p className="text-sm">كن أول من ينشر!</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sellings.map((item: any) => {
              const isJunk = activeCat === "junk";
              const title = isJunk
                ? [item.type, item.model, item.year].filter(Boolean).join(" ") || "سيارة معطوبة"
                : `${item.brand ?? ""} ${item.model ?? ""} ${item.year ?? ""}`.trim();
              const price = item.price ? `$${Number(item.price).toLocaleString()}` : "السعر قابل للتفاوض";
              const city = item.city;
              const img = isJunk ? item.images?.[0] : item.primaryImage;
              const sellerId = isJunk ? item.sellerId : (item.sellerId ?? item.userId);
              const sellerName = item.sellerName;
              return (
                <div key={item.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {img ? (
                    <img src={imgUrl(img)} alt={title} className="w-full h-40 object-cover border-b" />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center border-b">
                      <Car className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-bold text-foreground text-sm line-clamp-1">{title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary text-sm" dir="ltr">{price}</span>
                      {city && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0"><MapPin className="w-3 h-3" />{city}</span>}
                    </div>
                    {sellerName && <p className="text-[11px] text-muted-foreground truncate">البائع: {sellerName}</p>}
                    <div className="flex gap-1.5 pt-1 border-t mt-1">
                      {!isJunk && (
                        <button
                          onClick={() => navigate(`/cars/${item.id}`)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-medium rounded-lg bg-secondary text-foreground whitespace-nowrap active:scale-95 transition-all"
                        >
                          <Eye className="w-2.5 h-2.5 shrink-0" /> التفاصيل
                        </button>
                      )}
                      {user && sellerId && user.id !== sellerId && (
                        <button
                          onClick={() => startChat(sellerId, `مرحباً، أنا مهتم بـ ${title}. هل ما زال متوفراً؟`)}
                          disabled={startingChat}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {startingChat ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <MessageCircle className="w-2.5 h-2.5" />} مراسلة
                        </button>
                      )}
                      <ShareSheet
                        options={{ title, url: `${window.location.origin}/listing/${item.id}` }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-medium rounded-lg bg-background text-muted-foreground border border-border whitespace-nowrap active:scale-95 transition-all"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── BUY REQUESTS SECTION ─── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground border-b pb-2">
          🛒 طلبات الشراء — {activeCatDef.label}
        </h2>
        {loadingReqs ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-2xl">
            <p className="text-lg font-bold mb-1">لا توجد طلبات شراء في هذا القسم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((r) => (
              <div key={r.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{r.brand || "أي ماركة"} {r.model || ""}</h3>
                    {(r.minYear || r.maxYear) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />{r.minYear ?? "—"} – {r.maxYear ?? "—"}
                      </p>
                    )}
                  </div>
                  {r.paymentType && (
                    <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                      <CreditCard className="w-3 h-3" />{PAYMENT_LABELS[r.paymentType] ?? r.paymentType}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {r.maxPrice && (
                    <span className="flex items-center gap-1 text-primary font-bold">
                      <DollarSign className="w-4 h-4" />حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}
                    </span>
                  )}
                  {r.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{r.city}</span>}
                </div>

                {r.description && (
                  <p className="text-sm text-muted-foreground border-t pt-3 leading-relaxed line-clamp-2">{r.description}</p>
                )}

                {r.userName && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <User className="w-3 h-3 shrink-0" />{r.userName}
                  </p>
                )}
                <div className="flex gap-1.5 pt-2 border-t">
                  {user && user.id !== r.userId && (
                    <button
                      onClick={() => startChat(r.userId, `مرحباً، رأيت طلبك لـ ${[r.brand, r.model].filter(Boolean).join(" ") || "مركبة"}. أنا لدي ما تبحث عنه، تواصل معي!`)}
                      disabled={startingChat}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {startingChat ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <MessageCircle className="w-2.5 h-2.5" />} مراسلة
                    </button>
                  )}
                  {user && user.id === r.userId && (
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-medium rounded-lg text-destructive border border-destructive/30 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> حذف
                    </button>
                  )}
                  <ShareSheet
                    options={{
                      title: `${r.brand || "أي ماركة"} ${r.model || ""}`.trim(),
                      price: r.maxPrice,
                      city: r.city,
                      url: `${window.location.origin}/buy-requests`,
                      description: r.description,
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-medium rounded-lg bg-background text-muted-foreground border border-border whitespace-nowrap active:scale-95 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
