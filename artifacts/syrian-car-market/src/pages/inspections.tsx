import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, Star, MapPin, Phone, CalendarCheck, Search,
  Loader2, ScanBarcode, Car, Fuel, Settings, Globe, Hash,
  DoorOpen, Gauge, AlertCircle, CheckCircle2, Info,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ══════════════════════════════════════════════════════════════
//  VIN NHTSA API — بدون بيانات وهمية
// ══════════════════════════════════════════════════════════════

type VinResult = {
  make: string;
  model: string;
  year: string;
  fuelType: string;
  engineModel: string;
  bodyClass: string;
  doors: string;
  vehicleType: string;
  plantCountry: string;
  driveType: string;
  cylinders: string;
  displacement: string;
  transmissionStyle: string;
  manufacturer: string;
  series: string;
  trim: string;
  errorCode: string;
  errorText: string;
};

const NA = "غير متوفر";

function extractVinField(results: any[], variable: string): string {
  const item = results.find((r: any) => r.Variable === variable);
  const val = item?.Value?.trim();
  if (!val || val === "Not Applicable" || val === "0" || val === "") return NA;
  return val;
}

async function fetchVinData(vin: string): Promise<VinResult> {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error("فشل الاتصال بخادم NHTSA");
  const data = await res.json();
  const r = data.Results ?? [];

  return {
    make:              extractVinField(r, "Make"),
    model:             extractVinField(r, "Model"),
    year:              extractVinField(r, "Model Year"),
    fuelType:          extractVinField(r, "Fuel Type - Primary"),
    engineModel:       extractVinField(r, "Engine Model"),
    bodyClass:         extractVinField(r, "Body Class"),
    doors:             extractVinField(r, "Doors"),
    vehicleType:       extractVinField(r, "Vehicle Type"),
    plantCountry:      extractVinField(r, "Plant Country"),
    driveType:         extractVinField(r, "Drive Type"),
    cylinders:         extractVinField(r, "Engine Number of Cylinders"),
    displacement:      extractVinField(r, "Displacement (L)"),
    transmissionStyle: extractVinField(r, "Transmission Style"),
    manufacturer:      extractVinField(r, "Manufacturer Name"),
    series:            extractVinField(r, "Series"),
    trim:              extractVinField(r, "Trim"),
    errorCode:         extractVinField(r, "Error Code"),
    errorText:         extractVinField(r, "Error Text"),
  };
}

// ══════════════════════════════════════════════════════════════
//  Inspection Centers Types
// ══════════════════════════════════════════════════════════════

type InspectionCenter = {
  id: number;
  name: string;
  city: string;
  province: string | null;
  address: string | null;
  phone: string | null;
  contact: string | null;
  rating: number;
  isFeatured: boolean;
  createdAt: string;
};

const QUERY_KEY = ["inspection-centers"];

// ══════════════════════════════════════════════════════════════
//  VIN Info Row
// ══════════════════════════════════════════════════════════════

function VinRow({ icon: Icon, label, value, color = "text-foreground" }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  const isNA = value === NA;
  return (
    <div className="flex items-center justify-between gap-2 py-2.5 border-b last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </div>
      <span className={cn(
        "text-sm font-semibold text-right",
        isNA ? "text-muted-foreground/60 italic font-normal" : color
      )}>
        {value}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Main Page
// ══════════════════════════════════════════════════════════════

export default function InspectionsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<"vin" | "centers">("vin");

  // VIN State
  const [vinInput, setVinInput] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);

  // Centers State
  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [bookingCenter, setBookingCenter] = useState<InspectionCenter | null>(null);
  const [date, setDate] = useState("");
  const [carId, setCarId] = useState("");

  // ── VIN Lookup ──────────────────────────────────────────────
  const handleVinLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const vin = vinInput.trim().toUpperCase();
    if (vin.length < 11) {
      setVinError("يجب أن يكون رقم VIN 17 خانة على الأقل");
      return;
    }
    setVinLoading(true);
    setVinResult(null);
    setVinError(null);
    try {
      const result = await fetchVinData(vin);
      // Error code 0 = no errors, 1/2 = some decode errors, 8/11 = invalid VIN
      if (result.errorCode !== NA && ["8", "11"].includes(result.errorCode)) {
        setVinError(`رقم VIN غير صالح: ${result.errorText !== NA ? result.errorText : "تحقق من الرقم وأعد المحاولة"}`);
      } else {
        setVinResult(result);
      }
    } catch (err: any) {
      setVinError("فشل الاتصال بخدمة NHTSA. تحقق من اتصالك بالإنترنت.");
    } finally {
      setVinLoading(false);
    }
  };

  // ── Inspection Centers ──────────────────────────────────────
  const { data: centers = [], isLoading } = useQuery<InspectionCenter[]>({
    queryKey: [...QUERY_KEY, searchQ],
    queryFn: () => api.get(`${BASE}/api/inspection-centers${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ""}`).then(r => r.json()),
    enabled: activeTab === "centers",
  });

  const featured = centers.filter(c => c.isFeatured);
  const regular = centers.filter(c => !c.isFeatured);

  const bookMutation = useMutation({
    mutationFn: (body: object) => api.inspections.book(body),
    onSuccess: (data: any) => {
      toast({ title: data.message ?? "تم حجز الموعد بنجاح" });
      setBookingCenter(null);
      setDate("");
      setCarId("");
      qc.invalidateQueries({ queryKey: ["inspections-mine"] });
    },
    onError: () => toast({ title: "حدث خطأ أثناء الحجز", variant: "destructive" }),
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (!bookingCenter || !date) return;
    bookMutation.mutate({ centerId: bookingCenter.id, date, carId: carId || undefined });
  };

  const handleContact = (center: InspectionCenter) => {
    const phone = center.phone || center.contact;
    if (phone) {
      window.open(`tel:${phone.replace(/[^0-9+]/g, "")}`, "_self");
    } else {
      toast({ title: "لا يوجد رقم هاتف لهذا المركز", variant: "destructive" });
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={cn("w-3.5 h-3.5", i <= full ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
        ))}
        <span className="text-xs text-muted-foreground mr-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const CenterCard = ({ center }: { center: InspectionCenter }) => (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full",
      center.isFeatured && "border-amber-300 ring-1 ring-amber-200"
    )}>
      <div className={cn(
        "px-4 py-3 flex items-start justify-between gap-2",
        center.isFeatured ? "bg-amber-50 border-b border-amber-100" : "bg-muted/30 border-b"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            center.isFeatured ? "bg-amber-100" : "bg-teal-100"
          )}>
            <ShieldCheck className={cn("w-5 h-5", center.isFeatured ? "text-amber-600" : "text-teal-600")} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground leading-tight">{center.name}</h3>
            {center.isFeatured && (
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> مركز مميز
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2 flex-1">
        {renderStars(center.rating)}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{[center.address, center.city, center.province].filter(Boolean).join("، ")}</span>
        </div>
        {(center.phone || center.contact) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span dir="ltr">{center.phone || center.contact}</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 flex gap-2 mt-auto">
        <Button size="sm" className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-bold"
          onClick={() => { if (!user) { navigate("/login"); return; } setBookingCenter(center); }}>
          <CalendarCheck className="w-3.5 h-3.5" /> حجز موعد
        </Button>
        <Button size="sm" variant="outline" className="flex-1 rounded-xl border-teal-300 text-teal-700 gap-1.5 text-xs font-bold"
          onClick={() => handleContact(center)}>
          <Phone className="w-3.5 h-3.5" /> تواصل
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-teal-600 to-teal-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/inspection.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">فحص المركبات</h1>
          </div>
          <p className="text-teal-100 text-sm">استعلام VIN + مراكز الفحص الموثوقة في سوريا</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex bg-muted/50 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("vin")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === "vin"
                ? "bg-teal-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ScanBarcode className="w-4 h-4" />
            فحص رقم VIN
          </button>
          <button
            onClick={() => setActiveTab("centers")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === "centers"
                ? "bg-teal-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            مراكز الفحص
          </button>
        </div>
      </div>

      {/* ── Tab: VIN Lookup ── */}
      {activeTab === "vin" && (
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-8 space-y-5">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-sm text-teal-800">
              <p className="font-bold mb-0.5">ما هو رقم VIN؟</p>
              <p className="text-teal-700 leading-relaxed">
                رقم تعريف المركبة (VIN) مكون من 17 خانة، موجود على لوح القيادة أو باب السائق أو وثائق المركبة.
                البيانات مُجلَبة مباشرة من قاعدة بيانات NHTSA الأمريكية الرسمية.
              </p>
            </div>
          </div>

          {/* VIN Input Form */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-teal-600" />
              أدخل رقم VIN للمركبة
            </h2>
            <form onSubmit={handleVinLookup} className="flex gap-2">
              <Input
                value={vinInput}
                onChange={e => {
                  setVinInput(e.target.value.toUpperCase());
                  setVinError(null);
                  if (!e.target.value) setVinResult(null);
                }}
                placeholder="مثال: 1HGBH41JXMN109186"
                maxLength={17}
                className="flex-1 rounded-xl font-mono text-sm tracking-widest uppercase"
                dir="ltr"
              />
              <Button
                type="submit"
                disabled={vinLoading || vinInput.trim().length < 11}
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 shrink-0"
              >
                {vinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {vinInput.length}/17 خانة
              </p>
              {vinInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setVinInput(""); setVinResult(null); setVinError(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {vinLoading && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
              <p className="text-sm text-muted-foreground">جارٍ الاستعلام من قاعدة بيانات NHTSA...</p>
            </div>
          )}

          {/* Error */}
          {vinError && !vinLoading && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700 text-sm">خطأ في الاستعلام</p>
                <p className="text-red-600 text-sm mt-0.5">{vinError}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {vinResult && !vinLoading && (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-2xl p-4">
                <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />
                <div>
                  <p className="font-bold text-teal-800 text-sm">تم الاستعلام بنجاح</p>
                  <p className="text-xs text-teal-600 mt-0.5 font-mono" dir="ltr">{vinInput.trim().toUpperCase()}</p>
                </div>
                {vinResult.errorCode !== NA && vinResult.errorCode !== "0" && (
                  <Badge variant="outline" className="mr-auto text-xs border-amber-300 text-amber-700 bg-amber-50">
                    تحذير: {vinResult.errorCode}
                  </Badge>
                )}
              </div>

              {/* Identity Card */}
              <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-teal-600 px-4 py-3">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Car className="w-4 h-4" /> هوية المركبة
                  </h3>
                </div>
                <div className="px-4 divide-y">
                  <VinRow icon={Car}    label="الشركة"       value={vinResult.make}         color="text-teal-700" />
                  <VinRow icon={Car}    label="الموديل"      value={vinResult.model}        color="text-teal-700" />
                  <VinRow icon={Hash}   label="سنة الصنع"    value={vinResult.year}         color="text-foreground" />
                  <VinRow icon={Car}    label="نوع الهيكل"   value={vinResult.bodyClass}    />
                  <VinRow icon={Car}    label="نوع المركبة"  value={vinResult.vehicleType}  />
                  <VinRow icon={Star}   label="الفئة / Series" value={vinResult.series}    />
                  <VinRow icon={Star}   label="الإصدار / Trim" value={vinResult.trim}      />
                  <VinRow icon={Globe}  label="بلد التصنيع"  value={vinResult.plantCountry} />
                  <VinRow icon={Globe}  label="المصنّع"      value={vinResult.manufacturer} />
                </div>
              </div>

              {/* Engine Card */}
              <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-teal-700 px-4 py-3">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" /> المحرك والأداء
                  </h3>
                </div>
                <div className="px-4 divide-y">
                  <VinRow icon={Fuel}    label="نوع الوقود"       value={vinResult.fuelType}          color="text-green-700" />
                  <VinRow icon={Settings} label="موديل المحرك"    value={vinResult.engineModel}       />
                  <VinRow icon={Gauge}   label="السعة (لتر)"       value={vinResult.displacement !== NA ? `${vinResult.displacement} L` : NA} />
                  <VinRow icon={Settings} label="عدد الأسطوانات"  value={vinResult.cylinders}         />
                  <VinRow icon={Settings} label="ناقل الحركة"     value={vinResult.transmissionStyle} />
                  <VinRow icon={Car}     label="نوع الدفع"         value={vinResult.driveType}         />
                  <VinRow icon={DoorOpen} label="عدد الأبواب"     value={vinResult.doors}             />
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>البيانات مُقدَّمة من NHTSA (الإدارة الوطنية لسلامة حركة المرور الأمريكية). قد لا تتوفر بيانات لمركبات غير أمريكية أو قديمة جداً.</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!vinResult && !vinLoading && !vinError && (
            <div className="text-center py-16 text-muted-foreground">
              <ScanBarcode className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-base font-bold mb-1">أدخل رقم VIN للبدء</p>
              <p className="text-sm">ستظهر بيانات المركبة مباشرة من قاعدة بيانات NHTSA</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Inspection Centers ── */}
      {activeTab === "centers" && (
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-8 space-y-6">
          {/* Search */}
          <form onSubmit={e => { e.preventDefault(); setSearchQ(search); }} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث باسم المركز، المدينة، المحافظة..."
                className="pr-9 rounded-xl"
              />
            </div>
            <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shrink-0">بحث</Button>
            {searchQ && (
              <Button type="button" variant="outline" onClick={() => { setSearchQ(""); setSearch(""); }} className="rounded-xl shrink-0">مسح</Button>
            )}
          </form>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
            </div>
          ) : centers.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xl font-bold mb-2">لا توجد مراكز فحص حالياً</p>
              {searchQ && <p className="text-sm">لا توجد نتائج لـ "{searchQ}"</p>}
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <h2 className="text-lg font-bold">المراكز المميزة</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featured.map(c => <CenterCard key={c.id} center={c} />)}
                  </div>
                </section>
              )}
              {regular.length > 0 && (
                <section>
                  {featured.length > 0 && <h2 className="text-lg font-bold mb-4">جميع المراكز</h2>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regular.map(c => <CenterCard key={c.id} center={c} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={!!bookingCenter} onOpenChange={o => { if (!o) setBookingCenter(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-teal-600" />
              حجز موعد فحص
            </DialogTitle>
          </DialogHeader>
          {bookingCenter && (
            <form onSubmit={handleBook} className="space-y-4 mt-2">
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                <p className="font-bold text-teal-800">{bookingCenter.name}</p>
                <p className="text-sm text-teal-600">{bookingCenter.city}</p>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">تاريخ الموعد *</label>
                <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">رقم السيارة (اختياري)</label>
                <Input value={carId} onChange={e => setCarId(e.target.value)}
                  placeholder="رقم لوحة السيارة أو رقم الإعلان" className="rounded-xl" />
              </div>
              <Button type="submit" disabled={bookMutation.isPending || !date}
                className="w-full rounded-xl font-bold bg-teal-600 hover:bg-teal-700">
                {bookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأكيد الحجز
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
