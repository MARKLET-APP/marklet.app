import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, ShoppingCart, MessageCircle, Loader2, Bike, Info } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type MotoItem = {
  id: number; brand: string | null; model: string | null; year: number | null;
  price: number | null; city: string | null; images: string[] | null;
  isFeatured: boolean; sellerId: number;
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; model: string | null;
  maxPrice: number | null; city: string | null; description: string | null;
  createdAt: string; userName: string | null;
};

const MOTO_QK = ["motorcycles"];
const BUY_QK = ["buy-requests-motorcycle"];

export default function MotorcyclesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [buyOpen, setBuyOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [buyForm, setBuyForm] = useState({ brand: "", model: "", maxPrice: "", city: "", description: "" });

  const { data: motos = [], isLoading } = useQuery<MotoItem[]>({
    queryKey: MOTO_QK,
    queryFn: () => api.get(`${BASE}/api/cars?category=motorcycle&limit=60`).then(r => r.json()).then((d: any) => d.cars ?? d),
  });

  const { data: buyReqs = [], isLoading: buyLoading } = useQuery<BuyRequest[]>({
    queryKey: BUY_QK,
    queryFn: () => api.get(`${BASE}/api/buy-requests?category=motorcycle`).then(r => r.json()),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post(`${BASE}/api/buy-requests`, body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب الشراء بنجاح" });
      setBuyOpen(false);
      setBuyForm({ brand: "", model: "", maxPrice: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    createBuy.mutate({ ...buyForm, maxPrice: buyForm.maxPrice ? Number(buyForm.maxPrice) : undefined, category: "motorcycle" });
  };

  const startChat = async (sellerId: number) => {
    if (!user) { navigate("/login"); return; }
    if (user.id === sellerId) { toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" }); return; }
    try {
      setStartingChat(true);
      const token = localStorage.getItem("scm_token");
      const res = await fetch(`${BASE}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ participantId: sellerId }),
      });
      const data = await res.json() as { id: number };
      navigate(`/chat?conversationId=${data.id}`);
    } catch {
      toast({ title: "تعذّر فتح المحادثة", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header + Buttons */}
      <div className="bg-gradient-to-l from-rose-600 to-rose-800 text-white px-4 pt-6 pb-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Bike className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">دراجات نارية</h1>
          </div>
          <p className="text-rose-100 text-sm mb-4">سوق الدراجات النارية في سوريا</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-rose-800 hover:bg-rose-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } navigate("/add-listing"); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان دراجة
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-rose-500/40 hover:bg-rose-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } setBuyOpen(true); }}
            >
              <ShoppingCart className="w-5 h-5" /> طلب شراء دراجة
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-5">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "sell" ? "text-rose-700 border-b-2 border-rose-700" : "text-muted-foreground")}
            onClick={() => setTab("sell")}
          >
            إعلانات البيع {motos.length > 0 && <span className="mr-1 text-xs bg-rose-100 text-rose-700 rounded-full px-2 py-0.5">{motos.length}</span>}
          </button>
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "buy" ? "text-rose-700 border-b-2 border-rose-700" : "text-muted-foreground")}
            onClick={() => setTab("buy")}
          >
            طلبات الشراء {buyReqs.length > 0 && <span className="mr-1 text-xs bg-rose-100 text-rose-700 rounded-full px-2 py-0.5">{buyReqs.length}</span>}
          </button>
        </div>

        {tab === "sell" && (
          isLoading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" /></div>
          ) : motos.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Bike className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xl font-bold mb-2">لا توجد دراجات نارية حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-6">
              {motos.map(m => (
                <div key={m.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/cars/${m.id}`)}>
                  {m.images?.[0] ? (
                    <img src={m.images[0]} alt={`${m.brand} ${m.model}`} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-muted flex items-center justify-center"><Bike className="w-12 h-12 text-muted-foreground/30" /></div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground">{[m.brand, m.model, m.year].filter(Boolean).join(" ")}</h3>
                      {m.isFeatured && <Badge className="bg-amber-500 text-white text-xs shrink-0">مميز</Badge>}
                    </div>
                    {m.price && <p className="text-rose-700 font-bold text-lg">${m.price.toLocaleString()}</p>}
                    {m.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{m.city}</p>}
                    <Button size="sm" variant="outline" className="w-full gap-1.5 border-rose-300 text-rose-700 mt-1" onClick={e => { e.stopPropagation(); startChat(m.sellerId); }} disabled={startingChat}>
                      {startingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />} مراسلة البائع
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "buy" && (
          buyLoading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" /></div>
          ) : buyReqs.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-xl font-bold mb-2">لا توجد طلبات شراء حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
              {buyReqs.map(r => (
                <div key={r.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                        <Bike className="w-4 h-4 text-rose-600" />
                      </div>
                      <h3 className="font-bold text-foreground text-sm">{[r.brand, r.model].filter(Boolean).join(" ") || "دراجة نارية"}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 border-rose-300 text-rose-700">طلب شراء</Badge>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{r.description}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mb-3">
                    {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                    {r.maxPrice && <span className="font-semibold text-rose-700">حتى ${r.maxPrice.toLocaleString()}</span>}
                    {r.userName && <span className="font-medium">{r.userName}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold"
                    onClick={() => startChat(r.userId)}
                    disabled={startingChat}
                  >
                    {startingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    مراسلة صاحب الطلب
                  </Button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Buy Request Dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء دراجة نارية</DialogTitle></DialogHeader>
          <form onSubmit={handleBuySubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input value={buyForm.brand} onChange={e => setBuyForm(p => ({ ...p, brand: e.target.value }))} placeholder="الماركة (هوندا، ياماها...)" />
              <Input value={buyForm.model} onChange={e => setBuyForm(p => ({ ...p, model: e.target.value }))} placeholder="الموديل" />
            </div>
            <Input value={buyForm.maxPrice} onChange={e => setBuyForm(p => ({ ...p, maxPrice: e.target.value }))} placeholder="أقصى سعر ($)" type="number" />
            <Input value={buyForm.city} onChange={e => setBuyForm(p => ({ ...p, city: e.target.value }))} placeholder="المدينة" />
            <textarea value={buyForm.description} onChange={e => setBuyForm(p => ({ ...p, description: e.target.value }))} placeholder="تفاصيل إضافية (السعة، النوع...)" className="w-full border rounded-xl p-3 text-sm resize-none h-24 bg-background" />
            <Button type="submit" disabled={createBuy.isPending} className="w-full rounded-xl font-bold bg-rose-600 hover:bg-rose-700">
              {createBuy.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
