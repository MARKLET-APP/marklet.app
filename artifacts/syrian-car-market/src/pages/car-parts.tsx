import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MapPin, Trash2, Wrench, ShoppingCart, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type CarPart = {
  id: number; sellerId: number; name: string; carType: string | null;
  model: string | null; year: number | null; condition: string | null;
  price: number; city: string | null; images: string[] | null;
  description: string | null; createdAt: string; sellerName: string | null;
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; model: string | null;
  minYear: number | null; maxYear: number | null; maxPrice: number | null;
  currency: string | null; city: string | null; description: string | null;
  category: string | null; createdAt: string; userName: string | null;
};

const PARTS_QK = (q: string) => ["car-parts", q];
const BUY_QK = ["buy-requests-parts"];

export default function CarPartsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [followupId, setFollowupId] = useState<number | null>(null);

  const [sellForm, setSellForm] = useState({ name: "", carType: "", model: "", year: "", condition: "مستعملة", price: "", currency: "USD", city: "", description: "" });
  const [buyForm, setBuyForm] = useState({ partName: "", carType: "", model: "", maxPrice: "", currency: "USD", city: "", description: "" });
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const followup = params.get("followup");
    const table = params.get("table");
    if (followup && table === "parts") {
      setFollowupId(Number(followup));
    }
  }, []);

  const { data: parts = [], isLoading } = useQuery<CarPart[]>({
    queryKey: PARTS_QK(q),
    queryFn: () => api.carParts.list(q),
  });

  const { data: buyReqs = [], isLoading: buyLoading } = useQuery<BuyRequest[]>({
    queryKey: BUY_QK,
    queryFn: () => api.get("/api/buy-requests?category=parts").then(r => r.json()),
  });

  const createSell = useMutation({
    mutationFn: (body: object) => api.carParts.create(body),
    onSuccess: () => {
      toast({ title: "تم نشر القطعة بنجاح" });
      setSellOpen(false);
      setSellForm({ name: "", carType: "", model: "", year: "", condition: "مستعملة", price: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: PARTS_QK(q) });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب الشراء وهو بانتظار مراجعة الإدارة" });
      setBuyOpen(false);
      setBuyForm({ partName: "", carType: "", model: "", maxPrice: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deletePart = useMutation({
    mutationFn: (id: number) => api.carParts.delete(id),
    onSuccess: () => { toast({ title: "تم الحذف" }); qc.invalidateQueries({ queryKey: PARTS_QK(q) }); },
  });

  const followupRespond = useMutation({
    mutationFn: (response: "yes" | "no") =>
      api.patch("/api/followup-respond", { table: "parts", id: followupId, response }),
    onSuccess: (_, response) => {
      setFollowupId(null);
      toast({ title: response === "yes" ? "شكراً! سعداء بمساعدتك 🎉" : "شكراً على إجابتك" });
    },
  });

  const handleSellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setSellForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBuyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setBuyForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const startChatWithSeller = async (sellerId: number, partName: string) => {
    if (!user) { navigate("/login"); return; }
    if (user.id === sellerId) { toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" }); return; }
    setStartingChat(true);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = localStorage.getItem("scm_token");
      const res = await fetch(`${BASE}/api/chats/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId, carId: null }),
      });
      const data = await res.json() as any;
      if (!res.ok) { throw new Error(data.error ?? "فشل"); }
      const initialMsg = encodeURIComponent(`مرحباً، أنا مهتم بالقطعة: ${partName}. هل ما زالت متوفرة؟`);
      navigate(`/messages?conversationId=${data.id}&initial=${initialMsg}`);
    } catch (err: any) {
      toast({ title: err.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header + Buttons */}
      <div className="relative overflow-hidden bg-gradient-to-l from-orange-600 to-orange-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/gear.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Wrench className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">سوق قطع السيارات</h1>
          </div>
          <p className="text-orange-100 text-sm mb-4">قطع غيار أصلية ومستعملة بأسعار مناسبة</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-orange-800 hover:bg-orange-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setSellOpen(true); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان بيع
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-orange-500/40 hover:bg-orange-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
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
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "sell" ? "text-orange-700 border-b-2 border-orange-700" : "text-muted-foreground")}
            onClick={() => setTab("sell")}
          >
            إعلانات البيع
          </button>
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "buy" ? "text-orange-700 border-b-2 border-orange-700" : "text-muted-foreground")}
            onClick={() => setTab("buy")}
          >
            طلبات الشراء
          </button>
        </div>

      {tab === "sell" && (
        <>
          <form onSubmit={e => { e.preventDefault(); setQ(search); }} className="flex gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم القطعة، النوع، الموديل..." className="rounded-xl" />
            <Button type="submit" size="icon" className="rounded-xl shrink-0"><Search className="w-4 h-4" /></Button>
            {q && <Button type="button" variant="ghost" onClick={() => { setQ(""); setSearch(""); }} className="rounded-xl">مسح</Button>}
          </form>
          {isLoading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
          ) : parts.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد قطع حالياً</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {parts.map(p => (
                <div key={p.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center"><Wrench className="w-12 h-12 text-muted-foreground/30" /></div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-foreground">{p.name}</h3>
                      {p.condition && <Badge variant="secondary" className="text-xs">{p.condition}</Badge>}
                    </div>
                    {(p.carType || p.model) && <p className="text-sm text-muted-foreground">{[p.carType, p.model, p.year].filter(Boolean).join(" • ")}</p>}
                    <div className="flex items-center justify-between pt-1">
                      {p.price ? <span className="font-bold text-primary" dir="ltr">${Number(p.price).toLocaleString()}</span> : <span className="text-muted-foreground text-sm">السعر عند التواصل</span>}
                      {p.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
                    </div>
                    {user && user.id !== p.sellerId && (
                      <Button size="sm" variant="outline" className="w-full gap-1 border-primary/40 text-primary mt-1" onClick={() => startChatWithSeller(p.sellerId, p.name)} disabled={startingChat}>
                        <MessageCircle className="w-3.5 h-3.5" /> مراسلة البائع
                      </Button>
                    )}
                    {user && user.id === p.sellerId && (
                      <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 mt-1" onClick={() => deletePart.mutate(p.id)}>
                        <Trash2 className="w-4 h-4 me-1" /> حذف
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "buy" && (
        buyLoading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : buyReqs.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد طلبات شراء حالياً</p></div>
        ) : (
          <div className="space-y-3">
            {buyReqs.map(r => (
              <div key={r.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-bold text-foreground">{[r.brand, r.model].filter(Boolean).join(" ") || "قطعة غيار"}</p>
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
      </div>

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">نشر قطعة سيارة للبيع</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createSell.mutate({ ...sellForm, year: sellForm.year ? Number(sellForm.year) : undefined, price: sellForm.price ? Number(sellForm.price) : 0 }); }} className="space-y-3 mt-2">
            <Input name="name" value={sellForm.name} onChange={handleSellChange} placeholder="اسم القطعة *" required />
            <div className="grid grid-cols-2 gap-3">
              <Input name="carType" value={sellForm.carType} onChange={handleSellChange} placeholder="نوع السيارة" />
              <Input name="model" value={sellForm.model} onChange={handleSellChange} placeholder="الموديل" />
              <Input type="number" name="year" value={sellForm.year} onChange={handleSellChange} placeholder="السنة" />
              <select name="condition" value={sellForm.condition} onChange={handleSellChange} className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="جديدة">جديدة</option>
                <option value="مستعملة">مستعملة</option>
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
            <Input name="city" value={sellForm.city} onChange={handleSellChange} placeholder="المدينة" />
            <textarea name="description" value={sellForm.description} onChange={handleSellChange} rows={2} placeholder="وصف إضافي" className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            <Button type="submit" disabled={createSell.isPending} className="w-full rounded-xl font-bold">
              {createSell.isPending ? "جارٍ النشر..." : "نشر القطعة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء قطعة غيار</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            createBuy.mutate({
              brand: buyForm.partName,
              model: buyForm.model,
              description: [buyForm.carType && `نوع السيارة: ${buyForm.carType}`, buyForm.description].filter(Boolean).join(" — "),
              maxPrice: buyForm.maxPrice ? Number(buyForm.maxPrice) : undefined,
              city: buyForm.city,
              category: "parts",
            });
          }} className="space-y-3 mt-2">
            <Input name="partName" value={buyForm.partName} onChange={handleBuyChange} placeholder="اسم القطعة المطلوبة *" required />
            <div className="grid grid-cols-2 gap-3">
              <Input name="carType" value={buyForm.carType} onChange={handleBuyChange} placeholder="نوع السيارة" />
              <Input name="model" value={buyForm.model} onChange={handleBuyChange} placeholder="الموديل" />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{buyForm.currency === "USD" ? "$" : "ل.س"}</span>
                <Input type="number" name="maxPrice" value={buyForm.maxPrice} onChange={handleBuyChange} placeholder="أعلى سعر — اختياري" className="pr-8" />
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
            <p className="text-muted-foreground">هل تم بيع القطعة؟ هل ساعدك <span className="font-bold text-primary">MARKLET</span> في إتمام الصفقة؟</p>
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
