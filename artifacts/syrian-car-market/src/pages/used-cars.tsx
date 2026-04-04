// UI_ID: USED_CARS_01
// NAME: سيارات مستعملة
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/runtimeConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, ShoppingCart, Car, MessageCircle, Loader2, Eye } from "lucide-react";
import { ShareSheet } from "@/components/ShareSheet";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useStartChat } from "@/hooks/use-start-chat";
import { BuyRequestCard } from "@/components/BuyRequestCard";
import { apiRequest } from "@/lib/api";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CarItem = {
  id: number; brand: string | null; model: string | null; year: number | null;
  price: number | null; city: string | null; images: string[] | null;
  condition: string | null; isFeatured: boolean; sellerId: number;
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; model: string | null;
  maxPrice: number | null; city: string | null; description: string | null;
  createdAt: string; userName: string | null;
};

const CARS_QK = ["used-cars"];
const BUY_QK = ["buy-requests-used"];

export default function UsedCarsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [buyOpen, setBuyOpen] = useState(false);
  const { startChat, loading: startingChat } = useStartChat();

  const { data: cars = [], isLoading } = useQuery<CarItem[]>({
    queryKey: CARS_QK,
    queryFn: () => api.get(`${BASE}/api/cars?condition=used&limit=60`).then(r => r.json()).then((d: any) => d.cars ?? d),
  });

  const { data: buyReqs = [], isLoading: buyLoading } = useQuery<BuyRequest[]>({
    queryKey: BUY_QK,
    queryFn: () => api.get(`${BASE}/api/buy-requests?category=used-car`).then(r => r.json()),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post(`${BASE}/api/buy-requests`, body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setBuyOpen(false);
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteBuy = useMutation({
    mutationFn: (id: number) => apiRequest(`${BASE}/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => { toast({ title: "تم حذف الطلب" }); qc.invalidateQueries({ queryKey: BUY_QK }); },
    onError: () => toast({ title: "حدث خطأ في الحذف", variant: "destructive" }),
  });

  const handleBuySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => (fd.get(k) as string) || "";
    createBuy.mutate({
      brand: g("brand"),
      model: g("model"),
      maxPrice: g("maxPrice") ? Number(g("maxPrice")) : undefined,
      city: g("city"),
      description: g("description") || undefined,
      category: "used-car",
    });
  };


  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header + Buttons */}
      <div className="relative overflow-hidden bg-gradient-to-l from-violet-600 to-violet-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/car.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Car className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">سيارات مستعملة</h1>
          </div>
          <p className="text-violet-100 text-sm mb-4">أفضل السيارات المستعملة بأسعار مناسبة</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-violet-800 hover:bg-violet-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } navigate("/add-listing"); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان سيارة مستعملة
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-violet-500/40 hover:bg-violet-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
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
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "sell" ? "text-violet-700 border-b-2 border-violet-700" : "text-muted-foreground")}
            onClick={() => setTab("sell")}
          >
            إعلانات البيع {cars.length > 0 && <span className="mr-1 text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{cars.length}</span>}
          </button>
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "buy" ? "text-violet-700 border-b-2 border-violet-700" : "text-muted-foreground")}
            onClick={() => setTab("buy")}
          >
            طلبات الشراء {buyReqs.length > 0 && <span className="mr-1 text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{buyReqs.length}</span>}
          </button>
        </div>

        {tab === "sell" && (
          isLoading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
          ) : cars.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Car className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xl font-bold mb-2">لا توجد سيارات مستعملة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-6">
              {cars.map(c => (
                <div key={c.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/cars/${c.id}`)}>
                  {c.images?.[0] ? (
                    <img src={imgUrl(c.images[0])} alt={`${c.brand} ${c.model}`} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-muted flex items-center justify-center"><Car className="w-12 h-12 text-muted-foreground/30" /></div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground">{[c.brand, c.model, c.year].filter(Boolean).join(" ")}</h3>
                      {c.isFeatured && <Badge className="bg-amber-500 text-white text-xs shrink-0">مميز</Badge>}
                    </div>
                    {c.price && <p className="text-violet-700 font-bold text-lg">${c.price.toLocaleString()}</p>}
                    {c.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</p>}
                    <div className="flex gap-1.5 pt-1 border-t mt-1" onClick={e => e.stopPropagation()}>
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-medium rounded-lg bg-secondary text-foreground whitespace-nowrap active:scale-95 transition-all"
                        onClick={() => navigate(`/cars/${c.id}`)}
                      >
                        <Eye className="w-2.5 h-2.5 shrink-0" /> التفاصيل
                      </button>
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground disabled:opacity-50 whitespace-nowrap active:scale-95 transition-all"
                        onClick={e => { e.stopPropagation(); startChat(c.sellerId, `مرحباً، أنا مهتم بـ ${[c.brand, c.model, c.year].filter(Boolean).join(" ")}. هل ما زالت متوفرة؟`); }}
                        disabled={startingChat}
                      >
                        {startingChat ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <MessageCircle className="w-2.5 h-2.5" />} مراسلة
                      </button>
                      <ShareSheet
                        options={{ title: `${[c.brand, c.model, c.year].filter(Boolean).join(" ")}`, price: c.price, city: c.city, url: `${window.location.origin}/listing/${c.id}` }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-[5px] px-1 text-[10px] font-medium rounded-lg bg-background text-muted-foreground border border-border whitespace-nowrap active:scale-95 transition-all"
                      />
                    </div>
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
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-xl font-bold mb-2">لا توجد طلبات شراء حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
              {buyReqs.map(r => (
                <BuyRequestCard
                  key={r.id}
                  data={r}
                  currentUserId={user?.id}
                  accentColor="violet"
                  label="سيارة مستعملة"
                  onChat={() => startChat(r.userId, `مرحباً، أنا بائع وأملك ${[r.brand, r.model].filter(Boolean).join(" ") || "سيارة مستعملة"} وقد تناسبك. هل ما زلت مهتماً؟`)}
                  chatLoading={startingChat}
                  onDelete={() => { if (confirm("حذف هذا الطلب؟")) deleteBuy.mutate(r.id); }}
                  deleteLoading={deleteBuy.isPending}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Buy Request Dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء سيارة مستعملة</DialogTitle></DialogHeader>
          <form key={buyOpen ? "open" : "closed"} onSubmit={handleBuySubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="brand" defaultValue="" placeholder="الماركة" autoComplete="off" />
              <Input name="model" defaultValue="" placeholder="الموديل" autoComplete="off" />
            </div>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
              <Input type="number" name="maxPrice" defaultValue="" placeholder="أقصى سعر (USD)" className="pr-7" />
            </div>
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />
            <textarea name="description" rows={3} placeholder="تفاصيل إضافية (السنة، الكيلومتراج، الحالة...)" className="w-full border rounded-xl p-3 text-sm resize-none bg-background" />
            <Button type="submit" disabled={createBuy.isPending} className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700">
              {createBuy.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
