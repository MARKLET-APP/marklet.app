import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VehicleType = "car" | "motorcycle" | "junk" | "rental";

interface BuyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: VehicleType;
  /** API category string sent to backend */
  category: string;
  /** Lock the vehicle type selector — hide it when the section is specific */
  lockType?: boolean;
  title?: string;
  /** Invalidation query key to refresh after success */
  queryKey?: unknown[];
  submitBtnClassName?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function BuyRequestDialog({
  open,
  onOpenChange,
  defaultType,
  category,
  lockType = true,
  title,
  queryKey,
  submitBtnClassName,
}: BuyRequestDialogProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultType);
  const [aiLoading, setAiLoading] = useState(false);

  const brandRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const descRef  = useRef<HTMLTextAreaElement>(null);

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post(`${BASE}/api/buy-requests`, body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      onOpenChange(false);
      if (queryKey) qc.invalidateQueries({ queryKey });
    },
    onError: () => toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" }),
  });

  const handleGenerateDesc = async () => {
    const brand = brandRef.current?.value?.trim() || "";
    const model = modelRef.current?.value?.trim() || "";
    const typeLabel = vehicleType === "car" ? "سيارة" : vehicleType === "motorcycle" ? "دراجة نارية" : vehicleType === "junk" ? "خردة" : "مركبة إيجار";
    const hint = [brand, model, typeLabel].filter(Boolean).join(" ");
    if (!hint) return;
    setAiLoading(true);
    try {
      const data = await api.post(`${BASE}/api/ai/generate-description`, {
        brand: brand || typeLabel, model: model || typeLabel, year: 2020, additionalNotes: `طلب شراء ${typeLabel}`,
      }) as { description?: string };
      if (data.description && descRef.current) descRef.current.value = data.description;
    } catch { /* silent */ } finally { setAiLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const g = (name: string) => (fd.get(name) as string) || "";
    const extras: string[] = [];

    if (vehicleType === "motorcycle") {
      if (g("bikeType")) extras.push(`نوع الدراجة: ${g("bikeType")}`);
      if (g("engineCC")) extras.push(`سعة المحرك: ${g("engineCC")} CC`);
    } else if (vehicleType === "junk") {
      if (g("weight")) extras.push(`الوزن التقريبي: ${g("weight")} كغ`);
      if (g("condition")) extras.push(`الحالة العامة: ${g("condition")}`);
    } else if (vehicleType === "rental") {
      if (g("dailyPrice")) extras.push(`السعر اليومي: ${g("dailyPrice")} $`);
      if (g("weeklyPrice")) extras.push(`السعر الأسبوعي: ${g("weeklyPrice")} $`);
      if (g("rentalDuration")) extras.push(`مدة الإيجار: ${g("rentalDuration")}`);
    } else {
      if (g("condition")) extras.push(`الحالة: ${g("condition")}`);
      if (g("fuelType")) extras.push(`الوقود: ${g("fuelType")}`);
      if (g("transmission")) extras.push(`ناقل الحركة: ${g("transmission")}`);
      if (g("mileage")) extras.push(`أقصى عداد: ${g("mileage")} كم`);
    }

    const userDesc = descRef.current?.value || g("description");
    const fullDesc = [userDesc, ...extras].filter(Boolean).join(" | ");

    createMutation.mutate({
      brand: g("brand"),
      model: vehicleType === "motorcycle" ? (g("bikeType") || g("model")) : g("model"),
      minYear: g("minYear") ? Number(g("minYear")) : undefined,
      maxYear: g("maxYear") ? Number(g("maxYear")) : undefined,
      maxPrice: g("maxPrice") ? Number(g("maxPrice")) : undefined,
      city: g("city"),
      paymentType: g("paymentType") || undefined,
      description: fullDesc || undefined,
      category,
    });
  };

  const dialogTitle = title ?? (
    vehicleType === "car" ? "طلب شراء سيارة" :
    vehicleType === "motorcycle" ? "طلب شراء دراجة نارية" :
    vehicleType === "junk" ? "طلب شراء سيارة خردة" :
    "طلب إيجار مركبة"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <form key={open ? "open" : "closed"} onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Vehicle type selector — shown only if not locked */}
          {!lockType && (
            <div className="space-y-2">
              <label className="text-sm font-bold">نوع المركبة *</label>
              <div className="grid grid-cols-4 gap-2">
                {([ { v: "car" as VehicleType, icon: "🚗", label: "سيارة" },
                    { v: "motorcycle" as VehicleType, icon: "🏍️", label: "دراجة" },
                    { v: "junk" as VehicleType, icon: "🔧", label: "خردة" },
                    { v: "rental" as VehicleType, icon: "🔑", label: "إيجار" },
                ] ).map(({ v, icon, label }) => (
                  <button key={v} type="button" onClick={() => setVehicleType(v)}
                    className={cn("flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs transition-all",
                      vehicleType === v ? "border-primary bg-primary/10 text-primary font-bold" : "border-border hover:border-primary/40")}
                  >
                    <span className="text-lg">{icon}</span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fields per type */}
          <div key={vehicleType} className="space-y-3">

            {vehicleType === "car" && (<>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">الشركة</label>
                  <Input ref={brandRef} name="brand" defaultValue="" placeholder="Toyota" autoComplete="off" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">الموديل</label>
                  <Input ref={modelRef} name="model" defaultValue="" placeholder="كامري" autoComplete="off" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">سنة من</label>
                  <Input type="number" name="minYear" defaultValue="" placeholder="2010" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">سنة إلى</label>
                  <Input type="number" name="maxYear" defaultValue="" placeholder="2024" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">حالة السيارة</label>
                  <select name="condition" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">غير محدد</option><option value="جديدة">جديدة</option><option value="مستعملة">مستعملة</option>
                  </select></div>
                <div className="space-y-1"><label className="text-sm font-medium">ناقل الحركة</label>
                  <select name="transmission" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">غير محدد</option><option value="أوتوماتيك">أوتوماتيك</option><option value="يدوي">يدوي</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">الوقود</label>
                  <select name="fuelType" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">غير محدد</option><option value="بنزين">بنزين</option><option value="مازوت">مازوت</option><option value="كهرباء">كهرباء</option><option value="هجين">هجين</option>
                  </select></div>
                <div className="space-y-1"><label className="text-sm font-medium">أقصى عداد (كم)</label>
                  <Input type="number" name="mileage" defaultValue="" placeholder="100000" /></div>
              </div>
            </>)}

            {vehicleType === "motorcycle" && (<>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">الشركة</label>
                  <Input ref={brandRef} name="brand" defaultValue="" placeholder="Honda, Yamaha..." autoComplete="off" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">نوع الدراجة</label>
                  <select name="bikeType" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">اختر</option><option value="سبورت">سبورت</option><option value="كروزر">كروزر</option><option value="سكوتر">سكوتر</option><option value="أوف رود">أوف رود</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">سعة المحرك (CC)</label>
                  <Input type="number" name="engineCC" defaultValue="" placeholder="125" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">سنة الصنع</label>
                  <Input type="number" name="minYear" defaultValue="" placeholder="2018" /></div>
              </div>
            </>)}

            {vehicleType === "junk" && (<>
              <div className="space-y-1"><label className="text-sm font-medium">نوع المركبة</label>
                <Input ref={brandRef} name="brand" defaultValue="" placeholder="سيارة، شاحنة، باص..." autoComplete="off" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">الوزن التقريبي (كغ)</label>
                  <Input type="number" name="weight" defaultValue="" placeholder="800" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">المدينة</label>
                  <Input name="city" defaultValue="" placeholder="دمشق" autoComplete="off" /></div>
              </div>
              <div className="space-y-1"><label className="text-sm font-medium">الحالة العامة</label>
                <select name="condition" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="">غير محدد</option><option value="حالة جيدة">حالة جيدة</option><option value="مهشمة">مهشمة</option><option value="للقطع فقط">للقطع فقط</option>
                </select></div>
            </>)}

            {vehicleType === "rental" && (<>
              <div className="space-y-1"><label className="text-sm font-medium">نوع المركبة</label>
                <Input ref={brandRef} name="brand" defaultValue="" placeholder="سيارة، فان، شاحنة..." autoComplete="off" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">السعر اليومي ($)</label>
                  <Input type="number" name="dailyPrice" defaultValue="" placeholder="20" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">السعر الأسبوعي ($)</label>
                  <Input type="number" name="weeklyPrice" defaultValue="" placeholder="120" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">المدينة</label>
                  <Input name="city" defaultValue="" placeholder="دمشق" autoComplete="off" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">مدة الإيجار</label>
                  <Input name="rentalDuration" defaultValue="" placeholder="أسبوع، شهر..." autoComplete="off" /></div>
              </div>
            </>)}

            {/* Max price + city (for car / motorcycle) */}
            {(vehicleType === "car" || vehicleType === "motorcycle") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-sm font-medium">الحد الأقصى للسعر ($)</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">$</span>
                    <Input type="number" name="maxPrice" defaultValue="" placeholder="5000" className="pr-8" />
                  </div></div>
                <div className="space-y-1"><label className="text-sm font-medium">المدينة</label>
                  <Input name="city" defaultValue="" placeholder="دمشق" autoComplete="off" /></div>
              </div>
            )}

            {/* Payment type (car / motorcycle) */}
            {(vehicleType === "car" || vehicleType === "motorcycle") && (
              <div className="space-y-1"><label className="text-sm font-medium">طريقة الدفع</label>
                <select name="paymentType" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="">غير محدد</option><option value="cash">نقداً</option><option value="installment">تقسيط</option>
                </select></div>
            )}

            {/* Description + AI */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">تفاصيل إضافية</label>
                <button type="button" onClick={handleGenerateDesc} disabled={aiLoading}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 font-medium">
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  توليد بالذكاء الاصطناعي
                </button>
              </div>
              <textarea ref={descRef} name="description" defaultValue="" rows={3}
                placeholder="أي ملاحظات أو تفاصيل أخرى..."
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            </div>
          </div>

          <Button type="submit" disabled={createMutation.isPending}
            className={cn("w-full rounded-xl font-bold", submitBtnClassName)}>
            {createMutation.isPending ? "جارٍ النشر..." : "نشر الطلب"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
