// UI_ID: BUY_REQUESTS_01
// NAME: طلبات الشراء
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
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
import { MapPin, Calendar, DollarSign, Plus, Trash2, User, CreditCard, MessageCircle, Loader2, Wand2 } from "lucide-react";
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

type Category = "car" | "motorcycle" | "junk" | "plates";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقداً",
  installment: "تقسيط",
};

const CAT_TABS: { v: Category; icon: string; label: string; buyLabel: string }[] = [
  { v: "car",        icon: "🚗", label: "سيارات",  buyLabel: "طلب شراء سيارة" },
  { v: "motorcycle", icon: "🏍️", label: "دراجات",  buyLabel: "طلب شراء دراجة" },
  { v: "junk",       icon: "🔧", label: "خردة",    buyLabel: "طلب شراء خردة"  },
  { v: "plates",     icon: "#️⃣", label: "لوحات",   buyLabel: "طلب شراء لوحة"  },
];

export default function BuyRequests() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCat, setActiveCat] = useState<Category>("car");
  const [open, setOpen] = useState(false);
  const { startChat, loading: startingChat } = useStartChat();
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle" | "junk" | "rental">("car");
  const [aiLoading, setAiLoading] = useState(false);
  const brandRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const descRef  = useRef<HTMLTextAreaElement>(null);

  const handleGenerateDesc = async () => {
    const brand = brandRef.current?.value?.trim() || "";
    const model = modelRef.current?.value?.trim() || "";
    const typeLabel = vehicleType === "car" ? "سيارة" : vehicleType === "motorcycle" ? "دراجة نارية" : vehicleType === "junk" ? "خردة" : "مركبة إيجار";
    const hint = [brand, model, typeLabel].filter(Boolean).join(" ");
    if (!hint) { return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: hint, year: "", condition: "" }),
      });
      const data = await res.json();
      if (data.description && descRef.current) descRef.current.value = data.description;
    } catch { /* silent */ } finally { setAiLoading(false); }
  };

  const activeCatDef = CAT_TABS.find(t => t.v === activeCat)!;

  const { data: allRequests = [], isLoading: loadingReqs } = useQuery<BuyRequest[]>({
    queryKey: ["buy-requests"],
    queryFn: () => api.buyRequests.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.buyRequests.create(body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["buy-requests"] });
    },
    onError: () => toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.buyRequests.delete(id),
    onSuccess: () => { toast({ title: "تم حذف الطلب" }); queryClient.invalidateQueries({ queryKey: ["buy-requests"] }); },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (name: string) => (fd.get(name) as string) || "";
    const extras: string[] = [];
    if (vehicleType === "motorcycle") {
      if (g("bikeType")) extras.push(`نوع الدراجة: ${g("bikeType")}`);
      if (g("engineCC")) extras.push(`سعة المحرك: ${g("engineCC")} CC`);
      if (g("condition")) extras.push(`الحالة: ${g("condition")}`);
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
      if (g("mileage")) extras.push(`أقصى عداد: ${Number(g("mileage")).toLocaleString()} كم`);
    }
    const fullDesc = [g("description"), ...extras].filter(Boolean).join(" | ");
    const catMap: Record<string, string> = { car: "car", motorcycle: "motorcycle", junk: "junk", rental: "rental" };
    createMutation.mutate({
      brand: g("brand"),
      model: vehicleType === "motorcycle" ? (g("bikeType") || g("model")) : g("model"),
      minYear: g("minYear") ? Number(g("minYear")) : undefined,
      maxYear: g("maxYear") ? Number(g("maxYear")) : undefined,
      maxPrice: g("maxPrice") ? Number(g("maxPrice")) : undefined,
      city: g("city"),
      paymentType: g("paymentType"),
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">طلبات الشراء</h1>
        <p className="text-muted-foreground mt-1">ابحث عمّا تريد شراءه أو انشر طلبك وانتظر العروض</p>
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25">
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

                <div key={vehicleType}>
                {vehicleType === "car" && (<>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الشركة</label><Input ref={brandRef} name="brand" defaultValue="" placeholder="Toyota" autoComplete="off" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">الموديل</label><Input ref={modelRef} name="model" defaultValue="" placeholder="كامري" autoComplete="off" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">سنة من</label><Input type="number" name="minYear" defaultValue="" placeholder="2010" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">سنة إلى</label><Input type="number" name="maxYear" defaultValue="" placeholder="2024" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">حالة السيارة</label>
                      <select name="condition" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">غير محدد</option><option value="جديدة">جديدة</option><option value="مستعملة">مستعملة</option>
                      </select></div>
                    <div className="space-y-1"><label className="text-sm font-medium">ناقل الحركة</label>
                      <select name="transmission" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">غير محدد</option><option value="أوتوماتيك">أوتوماتيك</option><option value="يدوي">يدوي</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الوقود</label>
                      <select name="fuelType" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">غير محدد</option><option value="بنزين">بنزين</option><option value="مازوت">مازوت</option><option value="كهرباء">كهرباء</option><option value="هجين">هجين</option>
                      </select></div>
                    <div className="space-y-1"><label className="text-sm font-medium">أقصى عداد (كم)</label><Input type="number" name="mileage" defaultValue="" placeholder="100000" /></div>
                  </div>
                </>)}

                {vehicleType === "motorcycle" && (<>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الشركة</label><Input ref={brandRef} name="brand" defaultValue="" placeholder="Honda, Yamaha..." autoComplete="off" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">نوع الدراجة</label>
                      <select name="bikeType" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">اختر</option><option value="سبورت">سبورت</option><option value="كروزر">كروزر</option><option value="سكوتر">سكوتر</option><option value="أوف رود">أوف رود</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">سعة المحرك (CC)</label><Input type="number" name="engineCC" defaultValue="" placeholder="125" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">سنة الصنع</label><Input type="number" name="minYear" defaultValue="" placeholder="2018" /></div>
                  </div>
                </>)}

                {vehicleType === "junk" && (<>
                  <div className="space-y-1 mb-3"><label className="text-sm font-medium">نوع المركبة</label><Input ref={brandRef} name="brand" defaultValue="" placeholder="سيارة، شاحنة، باص..." autoComplete="off" /></div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الوزن التقريبي (كغ)</label><Input type="number" name="weight" defaultValue="" placeholder="800" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">المدينة</label><Input name="city" defaultValue="" placeholder="دمشق" autoComplete="off" /></div>
                  </div>
                  <div className="space-y-1 mb-3"><label className="text-sm font-medium">الحالة العامة</label>
                    <select name="condition" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">غير محدد</option><option value="حالة جيدة">حالة جيدة</option><option value="مهشمة">مهشمة</option><option value="للقطع فقط">للقطع فقط</option>
                    </select></div>
                </>)}

                {vehicleType === "rental" && (<>
                  <div className="space-y-1 mb-3"><label className="text-sm font-medium">نوع المركبة</label><Input ref={brandRef} name="brand" defaultValue="" placeholder="سيارة، فان، شاحنة..." autoComplete="off" /></div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">السعر اليومي ($)</label><Input type="number" name="dailyPrice" defaultValue="" placeholder="20" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">السعر الأسبوعي ($)</label><Input type="number" name="weeklyPrice" defaultValue="" placeholder="120" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">المدينة</label><Input name="city" defaultValue="" placeholder="دمشق" autoComplete="off" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">مدة الإيجار</label><Input name="rentalDuration" defaultValue="" placeholder="أسبوع، شهر..." autoComplete="off" /></div>
                  </div>
                </>)}

                {(vehicleType === "car" || vehicleType === "motorcycle") && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1"><label className="text-sm font-medium">الحد الأقصى للسعر ($)</label>
                      <div className="relative"><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">$</span>
                        <Input type="number" name="maxPrice" defaultValue="" placeholder="5000" className="pr-8" /></div></div>
                    <div className="space-y-1"><label className="text-sm font-medium">المدينة</label><Input name="city" defaultValue="" placeholder="دمشق" autoComplete="off" /></div>
                  </div>
                )}

                {(vehicleType === "car" || vehicleType === "motorcycle") && (
                  <div className="space-y-1 mb-3"><label className="text-sm font-medium">طريقة الدفع</label>
                    <select name="paymentType" defaultValue="" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">غير محدد</option><option value="cash">نقداً</option><option value="installment">تقسيط</option>
                    </select></div>
                )}

                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">تفاصيل إضافية</label>
                    <button
                      type="button"
                      onClick={handleGenerateDesc}
                      disabled={aiLoading}
                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 font-medium"
                    >
                      {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      توليد بالذكاء الاصطناعي
                    </button>
                  </div>
                  <textarea ref={descRef} name="description" defaultValue="" rows={3} placeholder="أي ملاحظات أو تفاصيل أخرى..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
                </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl font-bold">
                  {createMutation.isPending ? "جارٍ النشر..." : "نشر الطلب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

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
