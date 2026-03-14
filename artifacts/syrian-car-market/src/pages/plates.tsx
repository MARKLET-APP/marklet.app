import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, ShoppingCart, CheckCircle2, XCircle, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type PlateItem = {
  id: number; userId: number; brand: string | null; price: number | null;
  city: string | null; description: string | null; createdAt: string; sellerName?: string | null;
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; maxPrice: number | null;
  currency: string | null; city: string | null; description: string | null;
  createdAt: string; userName: string | null;
};

const PLATES_QK = ["plates"];
const BUY_QK = ["buy-requests-plates"];

export default function PlatesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [sellOpen, setSellOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [followupId, setFollowupId] = useState<number | null>(null);

  const [sellForm, setSellForm] = useState({ plateNumber: "", price: "", city: "", description: "" });
  const [buyForm, setBuyForm] = useState({ plateDesc: "", maxPrice: "", city: "", description: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const followup = params.get("followup");
    const table = params.get("table");
    if (followup && table === "buyreq") {
      setFollowupId(Number(followup));
    }
  }, []);

  const { data: plates = [], isLoading } = useQuery<PlateItem[]>({
    queryKey: PLATES_QK,
    queryFn: () => api.get("/api/cars?category=plates&limit=50").then(r => r.json()).then((d: any) => d.cars ?? d),
  });

  const { data: buyReqs = [], isLoading: buyLoading } = useQuery<BuyRequest[]>({
    queryKey: BUY_QK,
    queryFn: () => api.get("/api/buy-requests?category=plates").then(r => r.json()),
  });

  const createSell = useMutation({
    mutationFn: (body: object) => api.post("/api/cars", body),
    onSuccess: () => {
      toast({ title: "تم نشر اللوحة بنجاح وهي بانتظار مراجعة الإدارة" });
      setSellOpen(false);
      setSellForm({ plateNumber: "", price: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: PLATES_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب الشراء وهو بانتظار مراجعة الإدارة" });
      setBuyOpen(false);
      setBuyForm({ plateDesc: "", maxPrice: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const followupRespond = useMutation({
    mutationFn: (response: "yes" | "no") =>
      api.patch("/api/followup-respond", { table: "buyreq", id: followupId, response }),
    onSuccess: (_, response) => {
      setFollowupId(null);
      toast({ title: response === "yes" ? "شكراً! سعداء بمساعدتك 🎉" : "شكراً على إجابتك" });
    },
  });

  const handleSellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSellForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBuyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBuyForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Hash className="w-8 h-8 text-primary" /> سوق لوحات السيارات
          </h1>
          <p className="text-muted-foreground mt-1">بيع وشراء أرقام وألواح السيارات المميزة</p>
        </div>

        {user && (
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setSellOpen(true)} className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground hover-elevate shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4" /> نشر لوحة للبيع
            </Button>
            <Button onClick={() => setBuyOpen(true)} variant="outline" className="gap-2 rounded-xl font-bold border-2 border-primary text-primary hover:bg-primary/5">
              <ShoppingCart className="w-4 h-4" /> طلب شراء لوحة
            </Button>
          </div>
        )}

        <div className="flex rounded-xl border overflow-hidden w-fit">
          <button onClick={() => setTab("sell")} className={cn("px-5 py-2 text-sm font-bold transition-colors", tab === "sell" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}>
            لوحات للبيع
          </button>
          <button onClick={() => setTab("buy")} className={cn("px-5 py-2 text-sm font-bold transition-colors", tab === "buy" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}>
            طلبات شراء
          </button>
        </div>
      </div>

      {tab === "sell" && (
        isLoading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : plates.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد لوحات للبيع حالياً</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plates.map((p: any) => (
              <div key={p.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 flex flex-col items-center justify-center gap-2 border-b">
                  <div className="bg-amber-400 text-amber-900 font-black text-2xl tracking-widest px-6 py-2 rounded-lg border-4 border-amber-600 shadow-md">
                    {p.brand ?? p.plateNumber ?? "لوحة مميزة"}
                  </div>
                  <span className="text-xs text-amber-700 font-semibold">لوحة مرور سورية</span>
                </div>
                <div className="p-4 space-y-2">
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  <div className="flex items-center justify-between pt-1">
                    {p.price ? <span className="font-bold text-primary">{Number(p.price).toLocaleString("ar-SY")} ل.س</span> : <span className="text-muted-foreground text-sm">السعر قابل للتفاوض</span>}
                    {p.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
                  </div>
                  {p.sellerName && <p className="text-xs text-muted-foreground">البائع: {p.sellerName}</p>}
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
            {buyReqs.map((r: any) => (
              <div key={r.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-bold text-foreground">{r.brand || "لوحة مميزة"}</p>
                {r.maxPrice && <p className="text-sm text-primary font-semibold">حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "ل.س"}</p>}
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mt-1">
                  {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                  {r.userName && <span>الطالب: {r.userName}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">نشر لوحة سيارة للبيع</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            createSell.mutate({
              brand: sellForm.plateNumber,
              price: sellForm.price ? Number(sellForm.price) : undefined,
              city: sellForm.city || undefined,
              description: sellForm.description || undefined,
              category: "plates",
              saleType: "sale",
            });
          }} className="space-y-3 mt-2">
            <Input name="plateNumber" value={sellForm.plateNumber} onChange={handleSellChange} placeholder="رقم اللوحة أو وصفها *" required />
            <Input type="number" name="price" value={sellForm.price} onChange={handleSellChange} placeholder="السعر (ل.س)" />
            <Input name="city" value={sellForm.city} onChange={handleSellChange} placeholder="المدينة" />
            <textarea name="description" value={sellForm.description} onChange={handleSellChange} rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            <Button type="submit" disabled={createSell.isPending} className="w-full rounded-xl font-bold">
              {createSell.isPending ? "جارٍ النشر..." : "نشر اللوحة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء لوحة سيارة</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            createBuy.mutate({
              brand: buyForm.plateDesc,
              maxPrice: buyForm.maxPrice ? Number(buyForm.maxPrice) : undefined,
              city: buyForm.city || undefined,
              description: buyForm.description || undefined,
              category: "plates",
            });
          }} className="space-y-3 mt-2">
            <Input name="plateDesc" value={buyForm.plateDesc} onChange={handleBuyChange} placeholder="وصف اللوحة المطلوبة *" required />
            <Input type="number" name="maxPrice" value={buyForm.maxPrice} onChange={handleBuyChange} placeholder="أعلى سعر (ل.س)" />
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
            <DialogTitle className="text-xl font-bold text-center">متابعة الطلب</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">هل تمكنت من شراء اللوحة التي طلبتها؟ هل ساعدك <span className="font-bold text-primary">MARKLET</span> في إتمام الصفقة؟</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => followupRespond.mutate("yes")} disabled={followupRespond.isPending} className="gap-2 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex-1">
                <CheckCircle2 className="w-4 h-4" /> نعم، تم الشراء
              </Button>
              <Button onClick={() => followupRespond.mutate("no")} disabled={followupRespond.isPending} variant="outline" className="gap-2 rounded-xl font-bold flex-1">
                <XCircle className="w-4 h-4" /> لا، لم أجد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
