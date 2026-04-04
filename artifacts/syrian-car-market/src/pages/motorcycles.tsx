// UI_ID: MOTORCYCLES_01
// NAME: الدراجات النارية
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
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetailDialog } from "@/components/ListingDetailDialog";

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
  const [selectedMoto, setSelectedMoto] = useState<MotoItem | null>(null);
  const { startChat, loading: startingChat } = useStartChat();

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
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setBuyOpen(false);
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMoto = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/api/cars/${id}`),
    onSuccess: () => { toast({ title: "تم حذف الإعلان بنجاح" }); qc.invalidateQueries({ queryKey: MOTO_QK }); },
    onError: () => toast({ title: "فشل حذف الإعلان", variant: "destructive" }),
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
      category: "motorcycle",
    });
  };


  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header + Buttons */}
      <div className="relative overflow-hidden bg-gradient-to-l from-rose-600 to-rose-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/motorcycle.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
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
                <ListingCard
                  key={m.id}
                  type="moto"
                  data={m}
                  currentUserId={user?.id}
                  onCardClick={() => setSelectedMoto(m)}
                  onChat={user?.id !== m.sellerId ? () => startChat(m.sellerId, `مرحباً، أنا مهتم بـ ${[m.brand, m.model, m.year].filter(Boolean).join(" ")}. هل ما زالت متوفرة؟`) : undefined}
                  onDelete={user?.id === m.sellerId ? () => { if (window.confirm("هل تريد حذف هذا الإعلان؟ لا يمكن التراجع.")) deleteMoto.mutate(m.id); } : undefined}
                  chatLoading={startingChat}
                  deleteLoading={deleteMoto.isPending}
                />
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
                  <button
                    className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-bold rounded-full bg-primary text-primary-foreground disabled:opacity-50 whitespace-nowrap active:scale-95 transition-all"
                    onClick={() => startChat(r.userId, `مرحباً، رأيت طلبك للدراجة النارية ${[r.brand, r.model].filter(Boolean).join(" ") || ""}. أنا لدي ما تبحث عنه، تواصل معي!`)}
                    disabled={startingChat}
                  >
                    {startingChat ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <MessageCircle className="w-2.5 h-2.5" />}
                    مراسلة
                  </button>
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
          <form key={buyOpen ? "open" : "closed"} onSubmit={handleBuySubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="brand" defaultValue="" placeholder="الماركة (هوندا، ياماها...)" autoComplete="off" />
              <Input name="model" defaultValue="" placeholder="الموديل" autoComplete="off" />
            </div>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
              <Input type="number" name="maxPrice" defaultValue="" placeholder="أقصى سعر (USD)" className="pr-7" />
            </div>
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />
            <textarea name="description" rows={3} placeholder="تفاصيل إضافية (السعة، النوع، الحالة...)" className="w-full border rounded-xl p-3 text-sm resize-none bg-background" />
            <Button type="submit" disabled={createBuy.isPending} className="w-full rounded-xl font-bold bg-rose-600 hover:bg-rose-700">
              {createBuy.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {selectedMoto && (
        <ListingDetailDialog
          open={!!selectedMoto}
          onClose={() => setSelectedMoto(null)}
          type="moto"
          data={selectedMoto}
          currentUserId={user?.id}
          onChat={() => { setSelectedMoto(null); startChat(selectedMoto.sellerId, `مرحباً، أنا مهتم بـ ${[selectedMoto.brand, selectedMoto.model, selectedMoto.year].filter(Boolean).join(" ")}. هل ما زالت متوفرة؟`); }}
          chatLoading={startingChat}
        />
      )}
    </div>
  );
}
