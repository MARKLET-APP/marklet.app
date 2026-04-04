// UI_ID: JUNK_CARS_01
// NAME: سيارات الحوادث
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, Car, ShoppingCart, CheckCircle2, XCircle, MessageCircle, Loader2, Upload, Image as ImageIcon, Wand2, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { ListingPreviewDialog } from "@/components/ListingPreviewDialog";
import { ListingDetailDialog } from "@/components/ListingDetailDialog";
import { BuyRequestCard } from "@/components/BuyRequestCard";
import { apiRequest } from "@/lib/api";

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

  const { startChat, loading: startingChat } = useStartChat();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [sellOpen, setSellOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [followupId, setFollowupId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedJunk, setSelectedJunk] = useState<JunkCar | null>(null);

  const [sellCurrency, setSellCurrency] = useState("USD");
  const [buyCurrency, setBuyCurrency] = useState("USD");
  const [sellIsAccident, setSellIsAccident] = useState(false);
  const sellDataRef = useRef<any>(null);

  const [sellImages, setSellImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const condRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const previews: string[] = await Promise.all(
        files.map(f => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(f);
        }))
      );
      setImagePreviews(prev => [...prev, ...previews]);
      setSellImages(prev => [...prev, ...previews]);
    } catch {
      toast({ title: "فشل رفع بعض الصور", variant: "destructive" });
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setSellImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateDesc = async () => {
    const brand = typeRef.current?.value || "";
    const year = yearRef.current?.value ? Number(yearRef.current.value) : 0;
    const condition = condRef.current?.value || "";
    if (!brand || !year) {
      toast({ title: "الرجاء إدخال نوع السيارة والسنة أولاً", variant: "destructive" });
      return;
    }
    setGeneratingDesc(true);
    try {
      const res = await api.post("/api/ai/generate-description", {
        brand, model: brand, year, condition: condition || "خردة", additionalNotes: "سيارة معطوبة / خردة",
      });
      const data = await res.json();
      if (descRef.current) descRef.current.value = data.description ?? "";
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setGeneratingDesc(false);
    }
  };

  const createSell = useMutation({
    mutationFn: (body: object) => api.junkCars.create(body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال إعلانك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setSellOpen(false);
      setShowPreview(false);
      sellDataRef.current = null;
      setSellCurrency("USD");
      setSellIsAccident(false);
      setSellImages([]);
      setImagePreviews([]);
      qc.invalidateQueries({ queryKey: JUNK_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setBuyOpen(false);
      setBuyCurrency("USD");
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteBuy = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => { toast({ title: "تم حذف الطلب" }); qc.invalidateQueries({ queryKey: BUY_QK }); },
    onError: () => toast({ title: "حدث خطأ في الحذف", variant: "destructive" }),
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

  const handleSellPreview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => (fd.get(k) as string) || "";
    sellDataRef.current = { type: g("type"), model: g("model"), year: g("year"), condition: g("condition"), price: g("price"), currency: g("currency"), city: g("city"), description: g("description"), isAccident: sellIsAccident, accidentImages: g("accidentImages") };
    setShowPreview(true);
  };

  const doSellSubmit = () => {
    const d = sellDataRef.current;
    if (!d) return;
    const desc = [d.description, d.isAccident ? "⚠️ السيارة تعرضت لحادث" : "", d.isAccident && d.accidentImages ? `صور الحادث: ${d.accidentImages}` : ""].filter(Boolean).join(" | ");
    createSell.mutate({ ...d, year: d.year ? Number(d.year) : undefined, price: d.price ? Number(d.price) : undefined, description: desc || undefined, images: sellImages.length > 0 ? sellImages : undefined });
  };

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
              <ListingCard
                key={c.id}
                type="junk"
                data={c}
                currentUserId={user?.id}
                onCardClick={() => setSelectedJunk(c)}
                onChat={() => startChat(c.sellerId, `مرحباً، أنا مهتم بـ ${[c.type, c.model, c.year].filter(Boolean).join(" ") || "سيارتك المعطوبة"}. هل ما زالت متوفرة؟`)}
                chatLoading={startingChat}
                onDelete={() => deleteJunk.mutate(c.id)}
                deleteLoading={deleteJunk.isPending}
              />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
            {buyReqs.map(r => (
              <BuyRequestCard
                key={r.id}
                data={{ ...r, brand: [r.brand, r.model].filter(Boolean).join(" ") || undefined }}
                currentUserId={user?.id}
                accentColor="slate"
                label="سيارة معطوبة / خردة"
                onChat={() => startChat(r.userId, `مرحباً، أنا بائع وأملك ${[r.brand, r.model].filter(Boolean).join(" ") || "سيارة معطوبة"} وقد تناسبك. هل ما زلت مهتماً؟`)}
                chatLoading={startingChat}
                onDelete={() => { if (confirm("حذف هذا الطلب؟")) deleteBuy.mutate(r.id); }}
                deleteLoading={deleteBuy.isPending}
              />
            ))}
          </div>
        )
      )}
      </div>

      <Dialog open={sellOpen} onOpenChange={o => { setSellOpen(o); if (!o) { setSellImages([]); setImagePreviews([]); setSellIsAccident(false); setSellCurrency("USD"); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">بيع سيارة معطوبة / خردة</DialogTitle></DialogHeader>
          <form key={sellOpen ? "open" : "closed"} onSubmit={handleSellPreview} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input ref={typeRef} name="type" defaultValue="" placeholder="نوع السيارة *" required autoComplete="off" />
              <Input name="model" defaultValue="" placeholder="الموديل" autoComplete="off" />
              <Input ref={yearRef} type="number" name="year" defaultValue="" placeholder="السنة *" required />
              <select ref={condRef} name="condition" defaultValue="حادث" className="border rounded-md px-3 py-2 text-sm bg-background">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{sellCurrency === "USD" ? "$" : "ل.س"}</span>
                <Input type="number" name="price" defaultValue="" placeholder="السعر — اختياري" className="pr-8" />
              </div>
              <select name="currency" defaultValue="USD" onChange={e => setSellCurrency(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background w-20">
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input type="checkbox" checked={sellIsAccident} onChange={e => setSellIsAccident(e.target.checked)} className="rounded" />
              السيارة تعرضت لحادث
            </label>
            {sellIsAccident && (
              <Input name="accidentImages" defaultValue="" placeholder="روابط صور الحادث (اختياري)" autoComplete="off" />
            )}
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />

            {/* AI Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold flex items-center gap-1"><Wand2 className="w-4 h-4 text-primary" /> الوصف</label>
                <Button type="button" size="sm" variant="outline" className="gap-1 text-xs h-7 px-2 rounded-lg" onClick={handleGenerateDesc} disabled={generatingDesc}>
                  {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  {generatingDesc ? "جارٍ التوليد..." : "توليد بالذكاء الاصطناعي"}
                </Button>
              </div>
              <textarea ref={descRef} name="description" rows={3} placeholder="وصف الحالة..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> صور السيارة (اختياري)</label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} tabIndex={-1} onChange={handleFileChange} />
              <Button type="button" variant="outline" className="w-full rounded-xl gap-2 border-dashed border-2" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}>
                {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingImages ? "جارٍ رفع الصور..." : "رفع صور"}
              </Button>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border aspect-square">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-0.5" onClick={() => removeImage(i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={createSell.isPending || uploadingImages} className="w-full rounded-xl font-bold">
              {uploadingImages ? "جارٍ رفع الصور..." : "معاينة قبل النشر"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء سيارة معطوبة / خردة</DialogTitle></DialogHeader>
          <form key={buyOpen ? "open" : "closed"} onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const g = (k: string) => (fd.get(k) as string) || "";
            createBuy.mutate({ brand: g("type"), model: g("model"), year: g("year") ? Number(g("year")) : undefined, maxPrice: g("maxPrice") ? Number(g("maxPrice")) : undefined, city: g("city"), description: g("description"), category: "junk" });
          }} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="type" defaultValue="" placeholder="نوع السيارة" autoComplete="off" />
              <Input name="model" defaultValue="" placeholder="الموديل" autoComplete="off" />
              <Input type="number" name="year" defaultValue="" placeholder="السنة" />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{buyCurrency === "USD" ? "$" : "ل.س"}</span>
                <Input type="number" name="maxPrice" defaultValue="" placeholder="أعلى سعر" className="pr-8" />
              </div>
              <select name="currency" defaultValue="USD" onChange={e => setBuyCurrency(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background w-20">
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />
            <textarea name="description" defaultValue="" rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
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
            <p className="text-muted-foreground">هل تم بيع سيارتك المعطوبة؟ هل ساعدك <span className="font-bold text-primary">LAZEMNI</span> في إتمام الصفقة؟</p>
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
      {selectedJunk && (
        <ListingDetailDialog
          open={!!selectedJunk}
          onClose={() => setSelectedJunk(null)}
          type="junk"
          data={selectedJunk}
          currentUserId={user?.id}
          onChat={() => { setSelectedJunk(null); startChat(selectedJunk.sellerId, `مرحباً، أنا مهتم بـ ${[selectedJunk.type, selectedJunk.model, selectedJunk.year].filter(Boolean).join(" ") || "سيارتك المعطوبة"}. هل ما زالت متوفرة؟`); }}
          chatLoading={startingChat}
        />
      )}

      <ListingPreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={doSellSubmit}
        submitting={createSell.isPending}
        listing={{
          title: sellDataRef.current ? [sellDataRef.current.type, sellDataRef.current.model, sellDataRef.current.year].filter(Boolean).join(" ") : "",
          price: sellDataRef.current?.price || null,
          currency: (sellDataRef.current?.currency as "USD" | "SYP") || "USD",
          city: sellDataRef.current?.city || null,
          description: sellDataRef.current?.description || null,
          badges: sellDataRef.current ? [sellDataRef.current.condition, ...(sellDataRef.current.isAccident ? ["⚠️ حادث"] : [])] : [],
          meta: sellDataRef.current?.year ? [{ label: "السنة", value: sellDataRef.current.year }] : [],
        }}
      />
    </div>
  );
}
