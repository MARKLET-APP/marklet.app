import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, Car, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type JunkCar = {
  id: number; sellerId: number; type: string | null; model: string | null;
  year: number | null; condition: string | null; price: number | null;
  city: string | null; images: string[] | null; description: string | null;
  createdAt: string; sellerName: string | null;
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; model: string | null;
  minYear: number | null; maxYear: number | null; maxPrice: number | null;
  currency: string | null; city: string | null; description: string | null;
  category: string | null; createdAt: string; userName: string | null;
};

const CONDITIONS = ["حادث", "عطل", "خردة كاملة"];
const JUNK_QK = ["junk-cars"];
const BUY_QK = ["buy-requests-junk"];

export default function JunkCarsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [sellOpen, setSellOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [followupId, setFollowupId] = useState<number | null>(null);

  const [sellForm, setSellForm] = useState({ type: "", model: "", year: "", condition: "حادث", price: "", currency: "USD", city: "", description: "", isAccident: false, accidentImages: "" });
  const [buyForm, setBuyForm] = useState({ type: "", model: "", year: "", maxPrice: "", currency: "USD", city: "", description: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const followup = params.get("followup");
    const table = params.get("table");
    if (followup && table === "junk") {
      setFollowupId(Number(followup));
    }
  }, []);

  const { data: cars = [], isLoading } = useQuery<JunkCar[]>({ queryKey: JUNK_QK, queryFn: () => api.junkCars.list() });
  const { data: buyReqs = [], isLoading: buyLoading } = useQuery<BuyRequest[]>({
    queryKey: BUY_QK,
    queryFn: () => api.get("/api/buy-requests?category=junk").then(r => r.json()),
  });

  const createSell = useMutation({
    mutationFn: (body: object) => api.junkCars.create(body),
    onSuccess: (data) => {
      toast({ title: data.message ?? "تم نشر الإعلان" });
      setSellOpen(false);
      setSellForm({ type: "", model: "", year: "", condition: "حادث", price: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: JUNK_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب الشراء وهو بانتظار مراجعة الإدارة" });
      setBuyOpen(false);
      setBuyForm({ type: "", model: "", year: "", maxPrice: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteJunk = useMutation({
    mutationFn: (id: number) => api.junkCars.delete(id),
    onSuccess: () => { toast({ title: "تم الحذف" }); qc.invalidateQueries({ queryKey: JUNK_QK }); },
  });

  const followupRespond = useMutation({
    mutationFn: (response: "yes" | "no") =>
      api.patch("/api/followup-respond", { table: "junk", id: followupId, response }),
    onSuccess: (_, response) => {
      setFollowupId(null);
      toast({ title: response === "yes" ? "شكراً! سعداء بمساعدتك 🎉" : "شكراً على إجابتك" });
    },
  });

  const handleSellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setSellForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBuyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBuyForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header + Buttons */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-700 to-slate-900 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/scrap.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Car className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">سيارات الخردة والمعطوبة</h1>
          </div>
          <p className="text-slate-300 text-sm mb-4">سيارات حوادث وخردة للبيع أو البحث عنها</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-slate-800 hover:bg-slate-100 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setSellOpen(true); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان بيع
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-slate-500/40 hover:bg-slate-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } setBuyOpen(true); }}
            >
              <ShoppingCart className="w-5 h-5" /> طلب شراء
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-5">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "sell" ? "text-slate-700 border-b-2 border-slate-700" : "text-muted-foreground")}
            onClick={() => setTab("sell")}
          >
            إعلانات البيع
          </button>
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "buy" ? "text-slate-700 border-b-2 border-slate-700" : "text-muted-foreground")}
            onClick={() => setTab("buy")}
          >
            طلبات الشراء
          </button>
        </div>

      {tab === "sell" && (
        isLoading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : cars.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد إعلانات حالياً</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cars.map(c => (
              <div key={c.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {c.images?.[0] ? (
                  <img src={c.images[0]} alt={c.model ?? "خردة"} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center"><Car className="w-12 h-12 text-muted-foreground/30" /></div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-foreground">{[c.type, c.model, c.year].filter(Boolean).join(" ") || "سيارة معطوبة"}</h3>
                    {c.condition && (
                      <Badge className={c.condition === "خردة كاملة" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}>
                        {c.condition}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {c.price ? <span className="font-bold text-primary" dir="ltr">${Number(c.price).toLocaleString()}</span> : <span className="text-muted-foreground text-sm">السعر قابل للتفاوض</span>}
                    {c.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  {user && user.id === c.sellerId && (
                    <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 mt-1" onClick={() => deleteJunk.mutate(c.id)}>
                      <Trash2 className="w-4 h-4 me-1" /> حذف
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "buy" && (
        buyLoading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : buyReqs.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد طلبات شراء حالياً</p></div>
        ) : (
          <div className="space-y-3">
            {buyReqs.map(r => (
              <div key={r.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-foreground">{[r.brand, r.model].filter(Boolean).join(" ") || "سيارة معطوبة / خردة"}</p>
                  {r.maxPrice && <p className="text-sm text-primary font-semibold">حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "ل.س"}</p>}
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                    {r.userName && <span>الطالب: {r.userName}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      </div>

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">بيع سيارة معطوبة / خردة</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            const desc = [
              sellForm.description,
              sellForm.isAccident ? "⚠️ السيارة تعرضت لحادث" : "",
              sellForm.isAccident && sellForm.accidentImages ? `صور الحادث: ${sellForm.accidentImages}` : "",
            ].filter(Boolean).join(" | ");
            createSell.mutate({
              ...sellForm,
              year: sellForm.year ? Number(sellForm.year) : undefined,
              price: sellForm.price ? Number(sellForm.price) : undefined,
              description: desc || undefined,
            });
          }} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="type" value={sellForm.type} onChange={handleSellChange} placeholder="نوع السيارة" />
              <Input name="model" value={sellForm.model} onChange={handleSellChange} placeholder="الموديل" />
              <Input type="number" name="year" value={sellForm.year} onChange={handleSellChange} placeholder="السنة" />
              <select name="condition" value={sellForm.condition} onChange={handleSellChange} className="border rounded-md px-3 py-2 text-sm bg-background">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{sellForm.currency === "USD" ? "$" : "ل.س"}</span>
                <Input type="number" name="price" value={sellForm.price} onChange={handleSellChange} placeholder="السعر — اختياري" className="pr-8" />
              </div>
              <select name="currency" value={sellForm.currency} onChange={handleSellChange} className="border rounded-md px-3 py-2 text-sm bg-background w-20">
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input type="checkbox" checked={sellForm.isAccident} onChange={e => setSellForm(p => ({ ...p, isAccident: e.target.checked }))} className="rounded" />
              السيارة تعرضت لحادث
            </label>
            {sellForm.isAccident && (
              <Input name="accidentImages" value={sellForm.accidentImages} onChange={handleSellChange} placeholder="روابط صور الحادث (اختياري)" />
            )}
            <Input name="city" value={sellForm.city} onChange={handleSellChange} placeholder="المدينة" />
            <textarea name="description" value={sellForm.description} onChange={handleSellChange} rows={2} placeholder="وصف الحالة..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            <Button type="submit" disabled={createSell.isPending} className="w-full rounded-xl font-bold">
              {createSell.isPending ? "جارٍ النشر..." : "نشر الإعلان"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء سيارة معطوبة / خردة</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createBuy.mutate({ brand: buyForm.type, model: buyForm.model, year: buyForm.year ? Number(buyForm.year) : undefined, maxPrice: buyForm.maxPrice ? Number(buyForm.maxPrice) : undefined, city: buyForm.city, description: buyForm.description, category: "junk" }); }} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="type" value={buyForm.type} onChange={handleBuyChange} placeholder="نوع السيارة" />
              <Input name="model" value={buyForm.model} onChange={handleBuyChange} placeholder="الموديل" />
              <Input type="number" name="year" value={buyForm.year} onChange={handleBuyChange} placeholder="السنة" />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{buyForm.currency === "USD" ? "$" : "ل.س"}</span>
                <Input type="number" name="maxPrice" value={buyForm.maxPrice} onChange={handleBuyChange} placeholder="أعلى سعر" className="pr-8" />
              </div>
              <select name="currency" value={buyForm.currency} onChange={handleBuyChange} className="border rounded-md px-3 py-2 text-sm bg-background w-20">
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            <Input name="city" value={buyForm.city} onChange={handleBuyChange} placeholder="المدينة" />
            <textarea name="description" value={buyForm.description} onChange={handleBuyChange} rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            <Button type="submit" disabled={createBuy.isPending} className="w-full rounded-xl font-bold">
              {createBuy.isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={followupId !== null} onOpenChange={open => { if (!open) setFollowupId(null); }}>
        <DialogContent className="max-w-sm text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">متابعة الإعلان</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">هل تم بيع سيارتك المعطوبة؟ هل ساعدك <span className="font-bold text-primary">MARKLET</span> في إتمام الصفقة؟</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => followupRespond.mutate("yes")} disabled={followupRespond.isPending} className="gap-2 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex-1">
                <CheckCircle2 className="w-4 h-4" /> نعم، تم البيع
              </Button>
              <Button onClick={() => followupRespond.mutate("no")} disabled={followupRespond.isPending} variant="outline" className="gap-2 rounded-xl font-bold flex-1">
                <XCircle className="w-4 h-4" /> لا، لم يُباع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
