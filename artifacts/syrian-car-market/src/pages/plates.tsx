import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, ShoppingCart, CheckCircle2, XCircle, Hash, Upload, X, ImageIcon, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

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

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const data = await res.json() as { url: string };
  return data.url;
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
  const [startingChat, setStartingChat] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sellForm, setSellForm] = useState({ plateNumber: "", plateType: "خصوصي", price: "", city: "", description: "" });
  const [buyForm, setBuyForm] = useState({ plateDesc: "", plateType: "خصوصي", maxPrice: "", city: "", description: "" });

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
      setSellForm({ plateNumber: "", plateType: "خصوصي", price: "", city: "", description: "" });
      setSellImages([]);
      setImagePreviews([]);
      qc.invalidateQueries({ queryKey: PLATES_QK });
    },
    onError: (err: any) => toast({ title: err?.message ?? "حدث خطأ", variant: "destructive" }),
  });

  const createBuy = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب الشراء وهو بانتظار مراجعة الإدارة" });
      setBuyOpen(false);
      setBuyForm({ plateDesc: "", plateType: "خصوصي", maxPrice: "", city: "", description: "" });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const previews = files.map(f => URL.createObjectURL(f));
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

  const handleSellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setSellForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleBuyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setBuyForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellImages.length === 0) {
      toast({ title: "يجب إضافة صورة واحدة على الأقل", variant: "destructive" });
      return;
    }
    createSell.mutate({
      brand: `${sellForm.plateType}: ${sellForm.plateNumber}`,
      model: "plate",
      year: 2024,
      mileage: 0,
      fuelType: "petrol",
      transmission: "manual",
      province: "Damascus",
      price: sellForm.price ? Number(sellForm.price) : 0,
      city: sellForm.city || "دمشق",
      description: `رقم اللوحة: ${sellForm.plateNumber} | نوع: ${sellForm.plateType}${sellForm.description ? " | " + sellForm.description : ""}`,
      category: "plates",
      saleType: "cash",
      images: sellImages,
    });
  };

  const startChat = async (targetUserId: number, initialMsg?: string) => {
    if (!user) { navigate("/login"); return; }
    if (user.id === targetUserId) {
      toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" }); return;
    }
    setStartingChat(true);
    try {
      const token = localStorage.getItem("scm_token");
      const res = await fetch(`${BASE}/api/chats/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: targetUserId, carId: null }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error ?? "فشل بدء المحادثة");
      const suffix = initialMsg ? `&initial=${encodeURIComponent(initialMsg)}` : "";
      navigate(`/messages?conversationId=${data.id}${suffix}`);
    } catch (err: any) {
      toast({ title: err.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
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
              <div key={p.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {p.primaryImage ? (
                  <img src={p.primaryImage} alt="لوحة" className="w-full h-36 object-cover border-b" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 flex flex-col items-center justify-center gap-2 border-b">
                    <div className="bg-amber-400 text-amber-900 font-black text-2xl tracking-widest px-6 py-2 rounded-lg border-4 border-amber-600 shadow-md">
                      {p.brand?.replace(/^[^:]+:\s*/, "") ?? "لوحة مميزة"}
                    </div>
                    <span className="text-xs text-amber-700 font-semibold">لوحة مرور سورية</span>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <p className="font-bold text-sm">{p.brand ?? "لوحة مميزة"}</p>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between pt-1">
                    {p.price ? <span className="font-bold text-primary" dir="ltr">${Number(p.price).toLocaleString()}</span> : <span className="text-muted-foreground text-sm">السعر قابل للتفاوض</span>}
                    {p.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
                  </div>
                  {p.sellerName && <p className="text-xs text-muted-foreground">البائع: {p.sellerName}</p>}
                  {user && user.id !== p.userId && (
                    <Button size="sm" className="w-full rounded-xl gap-1.5 mt-1 font-bold text-xs" onClick={() => startChat(p.userId, `مرحباً، أنا مهتم بلوحة ${[p.plateNumber, p.province].filter(Boolean).join(" - ")}. هل ما زالت متوفرة؟`)} disabled={startingChat}>
                      {startingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />} مراسلة البائع
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
            {buyReqs.map((r: any) => (
              <div key={r.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-bold text-foreground">{r.brand || "لوحة مميزة"}</p>
                {r.maxPrice && <p className="text-sm text-primary font-semibold" dir="ltr">حتى ${Number(r.maxPrice).toLocaleString()}</p>}
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mt-1">
                  {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                  {r.userName && <span>الطالب: {r.userName}</span>}
                </div>
                {user && user.id !== r.userId && (
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5 mt-2 text-xs" onClick={() => startChat(r.userId)} disabled={startingChat}>
                    {startingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />} مراسلة الطالب
                  </Button>
                )}
              </div>
            ))}
          </div>
        )
      )}
      </div>

      {/* Sell Dialog */}
      <Dialog open={sellOpen} onOpenChange={o => { setSellOpen(o); if (!o) { setSellImages([]); setImagePreviews([]); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl font-bold">نشر لوحة سيارة للبيع</DialogTitle></DialogHeader>
          <form onSubmit={handleSellSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input name="plateNumber" value={sellForm.plateNumber} onChange={handleSellChange} placeholder="رقم اللوحة *" required />
              <select name="plateType" value={sellForm.plateType} onChange={handleSellChange} className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="خصوصي">خصوصي</option>
                <option value="عمومي">عمومي</option>
                <option value="تجاري">تجاري</option>
                <option value="حكومي">حكومي</option>
              </select>
            </div>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
              <Input type="number" name="price" value={sellForm.price} onChange={handleSellChange} placeholder="السعر (USD)" className="pr-7" />
            </div>
            <Input name="city" value={sellForm.city} onChange={handleSellChange} placeholder="المدينة" />
            <textarea name="description" value={sellForm.description} onChange={handleSellChange} rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> صور اللوحة *</label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
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
              {createSell.isPending ? "جارٍ النشر..." : "نشر اللوحة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Buy Dialog */}
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
            <div className="grid grid-cols-2 gap-3">
              <Input name="plateDesc" value={buyForm.plateDesc} onChange={handleBuyChange} placeholder="وصف اللوحة المطلوبة *" required />
              <select name="plateType" value={buyForm.plateType} onChange={handleBuyChange} className="border rounded-md px-3 py-2 text-sm bg-background">
                <option value="خصوصي">خصوصي</option>
                <option value="عمومي">عمومي</option>
                <option value="تجاري">تجاري</option>
              </select>
            </div>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
              <Input type="number" name="maxPrice" value={buyForm.maxPrice} onChange={handleBuyChange} placeholder="أعلى سعر (USD)" className="pr-7" />
            </div>
            <Input name="city" value={buyForm.city} onChange={handleBuyChange} placeholder="المدينة" />
            <textarea name="description" value={buyForm.description} onChange={handleBuyChange} rows={2} placeholder="تفاصيل إضافية..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
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
