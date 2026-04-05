// UI_ID: CAR_PARTS_01
// NAME: قطع السيارات
import { useState, useEffect, useRef, useCallback } from "react";
import { useCropQueue } from "@/hooks/useCropQueue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MapPin, Trash2, Wrench, ShoppingCart, CheckCircle2, XCircle, MessageCircle, Loader2, Upload, Image as ImageIcon, Wand2, X } from "lucide-react";
import { useLocation } from "wouter";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { cn } from "@/lib/utils";
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { ListingPreviewDialog } from "@/components/ListingPreviewDialog";
import { ListingDetailDialog } from "@/components/ListingDetailDialog";
import { BuyRequestCard } from "@/components/BuyRequestCard";
import { apiRequest } from "@/lib/api";

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
  useScrollRestore("/car-parts");
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [followupId, setFollowupId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CarPart | null>(null);

  const [sellCurrency, setSellCurrency] = useState("USD");
  const [buyCurrency, setBuyCurrency] = useState("USD");
  const sellDataRef = useRef<any>(null);
  const { startChat, loading: startingChat } = useStartChat();

  const [sellImages, setSellImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingBuyDesc, setGeneratingBuyDesc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const partNameRef = useRef<HTMLInputElement>(null);
  const partDescRef = useRef<HTMLTextAreaElement>(null);
  const buyPartNameRef = useRef<HTMLInputElement>(null);
  const buyCarTypeRef = useRef<HTMLInputElement>(null);
  const buyDescRef = useRef<HTMLTextAreaElement>(null);

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

  const { openCropQueue, CropperComponent } = useCropQueue({
    onCropped: useCallback(({ dataUrl }: { file: File; blob: Blob; dataUrl: string }) => {
      setImagePreviews(prev => [...prev, dataUrl]);
      setSellImages(prev => [...prev, dataUrl]);
    }, []),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    openCropQueue(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setSellImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateDesc = async () => {
    const partName = partNameRef.current?.value || "";
    if (!partName) {
      toast({ title: "الرجاء إدخال اسم القطعة أولاً", variant: "destructive" });
      return;
    }
    setGeneratingDesc(true);
    try {
      const res = await api.post("/api/ai/generate-description", {
        brand: partName, model: partName, year: 2020, additionalNotes: "قطعة غيار سيارة",
      });
      const data = await res.json();
      if (partDescRef.current) partDescRef.current.value = data.description ?? "";
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleGenerateBuyDesc = async () => {
    const partName = buyPartNameRef.current?.value || "";
    const carType = buyCarTypeRef.current?.value || "";
    if (!partName) {
      toast({ title: "الرجاء إدخال اسم القطعة أولاً", variant: "destructive" });
      return;
    }
    setGeneratingBuyDesc(true);
    try {
      const res = await api.post("/api/ai/generate-description", {
        brand: partName, model: carType || partName, year: 2020, additionalNotes: "طلب شراء قطعة غيار سيارة",
      });
      const data = await res.json();
      if (buyDescRef.current) buyDescRef.current.value = data.description ?? "";
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setGeneratingBuyDesc(false);
    }
  };

  const createSell = useMutation({
    mutationFn: (body: object) => api.carParts.create(body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال إعلانك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setSellOpen(false);
      setShowPreview(false);
      sellDataRef.current = null;
      setSellCurrency("USD");
      setSellImages([]);
      setImagePreviews([]);
      qc.invalidateQueries({ queryKey: PARTS_QK(q) });
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

  const handleSellPreview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => (fd.get(k) as string) || "";
    const name = g("name");
    if (!name) {
      toast({ title: "يرجى إدخال اسم القطعة", variant: "destructive" });
      return;
    }
    sellDataRef.current = { name, carType: g("carType"), model: g("model"), year: g("year"), condition: g("condition"), price: g("price"), currency: g("currency"), city: g("city"), description: g("description") };
    setShowPreview(true);
  };

  const doSellSubmit = () => {
    const d = sellDataRef.current;
    if (!d) return;
    createSell.mutate({ ...d, year: d.year ? Number(d.year) : undefined, price: d.price ? Number(d.price) : 0, images: sellImages.length > 0 ? sellImages : undefined });
  };

  const startChatWithBuyer = (buyerId: number, partName: string) =>
    startChat(buyerId, `مرحباً، رأيت طلبك للقطعة: ${partName}. أنا لدي ما تبحث عنه!`);

  const startChatWithSeller = (sellerId: number, partName: string) =>
    startChat(sellerId, `مرحباً، أنا مهتم بالقطعة: ${partName}. هل ما زالت متوفرة؟`);

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
            <Input ref={searchRef} defaultValue={search} onInput={e => setSearch((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === "Enter") setQ((e.currentTarget as HTMLInputElement).value); }} placeholder="ابحث باسم القطعة، النوع، الموديل..." className="rounded-xl" />
            <Button type="submit" size="icon" className="rounded-xl shrink-0"><Search className="w-4 h-4" /></Button>
            {q && <Button type="button" variant="ghost" onClick={() => { setQ(""); setSearch(""); if (searchRef.current) searchRef.current.value = ""; }} className="rounded-xl">مسح</Button>}
          </form>
          {isLoading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
          ) : parts.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد قطع حالياً</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {parts.map(p => (
                <ListingCard
                  key={p.id}
                  type="part"
                  data={p}
                  currentUserId={user?.id}
                  onCardClick={() => setSelectedPart(p)}
                  onChat={() => startChatWithSeller(p.sellerId, p.name)}
                  chatLoading={startingChat}
                  onDelete={() => deletePart.mutate(p.id)}
                  deleteLoading={deletePart.isPending}
                />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
            {buyReqs.map(r => (
              <BuyRequestCard
                key={r.id}
                data={r}
                currentUserId={user?.id}
                accentColor="orange"
                label="قطعة غيار"
                onChat={() => startChatWithBuyer(r.userId, r.brand || "القطعة")}
                chatLoading={startingChat}
                onDelete={() => { if (confirm("حذف هذا الطلب؟")) deleteBuy.mutate(r.id); }}
                deleteLoading={deleteBuy.isPending}
              />
            ))}
          </div>
        )
      )}
      </div>

      <Dialog open={sellOpen} onOpenChange={o => { setSellOpen(o); if (!o) { setSellImages([]); setImagePreviews([]); setSellCurrency("USD"); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">نشر قطعة سيارة للبيع</DialogTitle></DialogHeader>
          <form key={sellOpen ? "open" : "closed"} onSubmit={handleSellPreview} className="space-y-3 mt-2">
            <Input ref={partNameRef} name="name" defaultValue="" placeholder="اسم القطعة *" required autoComplete="off" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="carType" defaultValue="" placeholder="نوع السيارة" autoComplete="off" />
              <Input name="model" defaultValue="" placeholder="الموديل" autoComplete="off" />
              <Input type="number" name="year" defaultValue="" placeholder="السنة" />
              <select name="condition" defaultValue="مستعملة" className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="جديدة">جديدة</option>
                <option value="مستعملة">مستعملة</option>
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
              <textarea ref={partDescRef} name="description" rows={3} placeholder="وصف إضافي للقطعة..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> صور القطعة (اختياري)</label>
              {CropperComponent}
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
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء قطعة غيار</DialogTitle></DialogHeader>
          <form key={buyOpen ? "open" : "closed"} onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const g = (k: string) => (fd.get(k) as string) || "";
            const carType = g("carType");
            createBuy.mutate({
              brand: g("partName"),
              model: g("model"),
              description: [carType && `نوع السيارة: ${carType}`, buyDescRef.current?.value || g("description")].filter(Boolean).join(" — "),
              maxPrice: g("maxPrice") ? Number(g("maxPrice")) : undefined,
              city: g("city"),
              category: "parts",
            });
          }} className="space-y-3 mt-2">
            <Input ref={buyPartNameRef} name="partName" defaultValue="" placeholder="اسم القطعة المطلوبة *" required autoComplete="off" />
            <div className="grid grid-cols-2 gap-3">
              <Input ref={buyCarTypeRef} name="carType" defaultValue="" placeholder="نوع السيارة" autoComplete="off" />
              <Input name="model" defaultValue="" placeholder="الموديل" autoComplete="off" />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{buyCurrency === "USD" ? "$" : "ل.س"}</span>
                <Input type="number" name="maxPrice" defaultValue="" placeholder="أعلى سعر — اختياري" className="pr-8" />
              </div>
              <select name="currency" defaultValue="USD" onChange={e => setBuyCurrency(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background w-20">
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">تفاصيل إضافية</label>
                <button type="button" onClick={handleGenerateBuyDesc} disabled={generatingBuyDesc}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 font-medium">
                  {generatingBuyDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  توليد بالذكاء الاصطناعي
                </button>
              </div>
              <textarea ref={buyDescRef} name="description" defaultValue="" rows={3} placeholder="أي ملاحظات أو تفاصيل أخرى..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            </div>
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
            <p className="text-muted-foreground">هل تم بيع القطعة؟ هل ساعدك <span className="font-bold text-primary">LAZEMNI</span> في إتمام الصفقة؟</p>
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
      {selectedPart && (
        <ListingDetailDialog
          open={!!selectedPart}
          onClose={() => setSelectedPart(null)}
          type="part"
          data={selectedPart}
          currentUserId={user?.id}
          onChat={() => { setSelectedPart(null); startChatWithSeller(selectedPart.sellerId, selectedPart.name); }}
          chatLoading={startingChat}
        />
      )}

      <ListingPreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={doSellSubmit}
        submitting={createSell.isPending}
        listing={{
          title: sellDataRef.current ? [sellDataRef.current.name, sellDataRef.current.carType, sellDataRef.current.model].filter(Boolean).join(" — ") : "",
          price: sellDataRef.current?.price || null,
          currency: (sellDataRef.current?.currency as "USD" | "SYP") || "USD",
          city: sellDataRef.current?.city || null,
          description: sellDataRef.current?.description || null,
          badges: sellDataRef.current ? [sellDataRef.current.condition, ...(sellDataRef.current.carType ? [sellDataRef.current.carType] : [])] : [],
          meta: sellDataRef.current?.year ? [{ label: "السنة", value: sellDataRef.current.year }] : [],
        }}
      />
    </div>
  );
}
