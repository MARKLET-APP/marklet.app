// UI_ID: PLATES_01
// NAME: لوحات السيارات
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { withApi } from "@/lib/runtimeConfig";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, ShoppingCart, CheckCircle2, XCircle, Hash, Upload, X, ImageIcon, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { ListingPreviewDialog } from "@/components/ListingPreviewDialog";
import { ListingDetailDialog } from "@/components/ListingDetailDialog";
import { BuyRequestCard } from "@/components/BuyRequestCard";
import { apiRequest } from "@/lib/api";

type PlateItem = {
  id: number; userId: number; brand: string | null; price: number | null;
  city: string | null; description: string | null; createdAt: string; sellerName?: string | null;
  primaryImage?: string | null; images?: string[];
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; maxPrice: number | null;
  currency: string | null; city: string | null; description: string | null;
  createdAt: string; userName: string | null;
};

const PLATES_QK = ["plates"];
const BUY_QK = ["buy-requests-plates"];


async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(withApi("/api/upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const data = await res.json() as { image?: string; url?: string; success?: boolean };
  return data.image ?? data.url;
}

export default function PlatesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"sell" | "buy">("sell");
  const [sellOpen, setSellOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [followupId, setFollowupId] = useState<number | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [sellImages, setSellImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<PlateItem | null>(null);
  const { startChat, loading: startingChat } = useStartChat();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sellDataRef = useRef<any>(null);

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
      toast({ title: "✅ تم إرسال إعلانك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setSellOpen(false);
      setShowPreview(false);
      sellDataRef.current = null;
      setSellImages([]);
      setImagePreviews([]);
      qc.invalidateQueries({ queryKey: PLATES_QK });
    },
    onError: (err: any) => toast({ title: err?.message ?? "حدث خطأ", variant: "destructive" }),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "✅ تم إرسال طلبك للمراجعة", description: "سيظهر في القائمة بعد موافقة الإدارة" });
      setBuyOpen(false);
      qc.invalidateQueries({ queryKey: BUY_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteBuy = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => { toast({ title: "تم حذف الطلب" }); qc.invalidateQueries({ queryKey: BUY_QK }); },
    onError: () => toast({ title: "حدث خطأ في الحذف", variant: "destructive" }),
  });

  const followupRespond = useMutation({
    mutationFn: (response: "yes" | "no") =>
      api.patch("/api/followup-respond", { table: "buyreq", id: followupId, response }),
    onSuccess: (_, response) => {
      setFollowupId(null);
      toast({ title: response === "yes" ? "شكراً! سعداء بمساعدتك 🎉" : "شكراً على إجابتك" });
    },
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
      const urls = await Promise.all(files.map(uploadImage));
      setSellImages(prev => [...prev, ...urls]);
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

  const handleSellSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sellImages.length === 0) {
      toast({ title: "يجب إضافة صورة واحدة على الأقل", variant: "destructive" });
      return;
    }
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => (fd.get(k) as string) || "";
    const plateNumber = g("plateNumber");
    if (!plateNumber) {
      toast({ title: "يرجى إدخال رقم اللوحة", variant: "destructive" });
      return;
    }
    sellDataRef.current = { plateNumber, plateType: g("plateType") || "خصوصي", price: g("price"), city: g("city"), description: g("description") };
    setShowPreview(true);
  };

  const doSellSubmit = () => {
    const d = sellDataRef.current;
    if (!d) return;
    createSell.mutate({
      brand: `${d.plateType}: ${d.plateNumber}`,
      model: "plate",
      year: 2024,
      mileage: 0,
      fuelType: "petrol",
      transmission: "manual",
      province: "دمشق",
      price: d.price ? Number(d.price) : 0,
      city: d.city || "دمشق",
      description: `رقم اللوحة: ${d.plateNumber} | نوع: ${d.plateType}${d.description ? " | " + d.description : ""}`,
      category: "plates",
      saleType: "cash",
      images: sellImages,
    });
  };


  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header + Buttons */}
      <div className="relative overflow-hidden bg-gradient-to-l from-amber-600 to-amber-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/plate.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Hash className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">سوق لوحات السيارات</h1>
          </div>
          <p className="text-amber-100 text-sm mb-4">بيع وشراء أرقام وألواح السيارات المميزة</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-amber-800 hover:bg-amber-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setSellOpen(true); }}
            >
              <Plus className="w-5 h-5" /> نشر لوحة للبيع
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-amber-500/40 hover:bg-amber-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } setBuyOpen(true); }}
            >
              <ShoppingCart className="w-5 h-5" /> طلب شراء لوحة
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-5">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "sell" ? "text-amber-700 border-b-2 border-amber-700" : "text-muted-foreground")}
            onClick={() => setTab("sell")}
          >
            لوحات للبيع
          </button>
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "buy" ? "text-amber-700 border-b-2 border-amber-700" : "text-muted-foreground")}
            onClick={() => setTab("buy")}
          >
            طلبات الشراء
          </button>
        </div>

      {tab === "sell" && (
        isLoading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : plates.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد لوحات للبيع حالياً</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plates.map((p: any) => (
              <ListingCard
                key={p.id}
                type="plate"
                data={{ ...p, sellerId: p.userId }}
                currentUserId={user?.id}
                onCardClick={() => setSelectedPlate(p)}
                onChat={() => startChat(p.userId, `مرحباً، أنا مهتم بلوحة ${[p.brand, p.city].filter(Boolean).join(" - ")}. هل ما زالت متوفرة؟`)}
                chatLoading={startingChat}
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
            {buyReqs.map((r: any) => (
              <BuyRequestCard
                key={r.id}
                data={r}
                currentUserId={user?.id}
                accentColor="amber"
                label="لوحة سيارة"
                onChat={() => startChat(r.userId, `مرحباً، أنا مالك لوحة ${r.brand || "مميزة"} وقد تناسبك. هل ما زلت مهتماً؟`)}
                chatLoading={startingChat}
                onDelete={() => { if (confirm("حذف هذا الطلب؟")) deleteBuy.mutate(r.id); }}
                deleteLoading={deleteBuy.isPending}
              />
            ))}
          </div>
        )
      )}
      </div>

      {/* Sell Dialog */}
      <Dialog open={sellOpen} onOpenChange={o => { setSellOpen(o); if (!o) { setSellImages([]); setImagePreviews([]); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">نشر لوحة سيارة للبيع</DialogTitle></DialogHeader>
          <form key={sellOpen ? "open" : "closed"} onSubmit={handleSellSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="plateNumber" defaultValue="" placeholder="رقم اللوحة *" required autoComplete="off" />
              <select name="plateType" defaultValue="خصوصي" className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="خصوصي">خصوصي</option>
                <option value="عمومي">عمومي</option>
                <option value="تجاري">تجاري</option>
                <option value="حكومي">حكومي</option>
              </select>
            </div>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
              <Input type="number" name="price" defaultValue="" placeholder="السعر (USD)" className="pr-7" />
            </div>
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />
            <textarea name="description" defaultValue="" rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> صور اللوحة *</label>
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
              {sellImages.length === 0 && <p className="text-xs text-muted-foreground">يجب رفع صورة واحدة على الأقل</p>}
            </div>

            <Button type="submit" disabled={createSell.isPending || uploadingImages} className="w-full rounded-xl font-bold">
              {uploadingImages ? "جارٍ رفع الصور..." : "معاينة قبل النشر"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Buy Dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">طلب شراء لوحة سيارة</DialogTitle></DialogHeader>
          <form key={buyOpen ? "open" : "closed"} onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const g = (k: string) => (fd.get(k) as string) || "";
            createBuy.mutate({
              brand: g("plateDesc"),
              maxPrice: g("maxPrice") ? Number(g("maxPrice")) : undefined,
              city: g("city") || undefined,
              description: g("description") || undefined,
              category: "plates",
            });
          }} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="plateDesc" defaultValue="" placeholder="وصف اللوحة المطلوبة *" required autoComplete="off" />
              <select name="plateType" defaultValue="خصوصي" className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="خصوصي">خصوصي</option>
                <option value="عمومي">عمومي</option>
                <option value="تجاري">تجاري</option>
              </select>
            </div>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
              <Input type="number" name="maxPrice" defaultValue="" placeholder="أعلى سعر (USD)" className="pr-7" />
            </div>
            <Input name="city" defaultValue="" placeholder="المدينة" autoComplete="off" />
            <textarea name="description" defaultValue="" rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
            <Button type="submit" disabled={createBuy.isPending} className="w-full rounded-xl font-bold">
              {createBuy.isPending ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Follow-up dialog */}
      <Dialog open={followupId !== null} onOpenChange={open => { if (!open) setFollowupId(null); }}>
        <DialogContent className="max-w-sm text-center" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold text-center">متابعة الطلب</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">هل تمكنت من شراء اللوحة التي طلبتها؟ هل ساعدك <span className="font-bold text-primary">LAZEMNI</span> في إتمام الصفقة؟</p>
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

      {selectedPlate && (
        <ListingDetailDialog
          open={!!selectedPlate}
          onClose={() => setSelectedPlate(null)}
          type="plate"
          data={{ ...selectedPlate, sellerId: selectedPlate.userId }}
          currentUserId={user?.id}
          onChat={() => { setSelectedPlate(null); startChat(selectedPlate.userId, `مرحباً، أنا مهتم بلوحة ${selectedPlate.brand ?? ""}. هل ما زالت متوفرة؟`); }}
          chatLoading={startingChat}
        />
      )}

      <ListingPreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={doSellSubmit}
        submitting={createSell.isPending}
        listing={{
          title: sellDataRef.current ? `${sellDataRef.current.plateType}: ${sellDataRef.current.plateNumber}` : "",
          price: sellDataRef.current?.price || null,
          currency: "USD",
          city: sellDataRef.current?.city || null,
          description: sellDataRef.current?.description || null,
          images: imagePreviews,
          badges: sellDataRef.current ? [sellDataRef.current.plateType, "لوحة سيارة"] : [],
        }}
      />
    </div>
  );
}
