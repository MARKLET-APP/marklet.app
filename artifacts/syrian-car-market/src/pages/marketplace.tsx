// UI_ID: MARKETPLACE_01 — كل شيء
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, ShoppingBag, Loader2, Truck, X, ImagePlus, Package,
} from "lucide-react";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MARKETPLACE_CATEGORIES = [
  "أثاث ومنزل", "ملابس وأحذية", "إلكترونيات",
  "أدوات ومعدات", "كتب وتعليم", "مستلزمات أطفال",
  "فنون وتحف", "رياضة وترفيه", "أجهزة منزلية", "أخرى",
];
const CONDITIONS = ["ممتاز", "جيد جداً", "جيد", "مقبول"];

// ── initialForm OUTSIDE component ────────────────────────────────────────────
const initialMarketForm = {
  title: "",
  category: MARKETPLACE_CATEGORIES[0],
  condition: "جيد",
  price: "",
  province: "",
  city: "",
  phone: "",
  shippingAvailable: false,
  description: "",
};

type MarketItem = {
  id: number; sellerId: number; title: string; price: string; currency: string;
  category: string; condition: string; images: string[] | null; province: string;
  city: string; shippingAvailable: boolean; isFeatured: boolean; viewCount: number;
  createdAt: string; sellerName: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(import.meta.env.BASE_URL + "api/upload-image?folder=marketplace", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("upload failed");
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(data.message || "upload failed");
  return data.url as string;
}

function ImagePicker({ previews, onAdd, onRemove }: {
  previews: string[]; onAdd: (files: FileList) => void; onRemove: (idx: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-border shrink-0">
            <img src={src} className="w-full h-full object-cover" alt="" />
            <button type="button" onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {previews.length < 8 && (
          <button type="button" onClick={() => ref.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-orange-400 hover:text-orange-500 transition-colors shrink-0">
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs">إضافة</span>
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) { onAdd(e.target.files); e.target.value = ""; } }} />
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { startChat, loading: startingChat } = useStartChat();

  // filters
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("__all__");
  const [filterCond, setFilterCond] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [filterShipping, setFilterShipping] = useState(false);

  // form
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(initialMarketForm);
  const update = useCallback((k: string, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v })), []);
  const handleInput = useCallback((field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm(prev => { if ((prev as any)[field] === value) return prev; return { ...prev, [field]: value }; });
    }, []);

  // images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImgs, setUploadingImgs] = useState(false);

  const addImages = (files: FileList) => {
    const arr = Array.from(files);
    const previews = arr.map(f => URL.createObjectURL(f));
    setImageFiles(p => [...p, ...arr]);
    setImagePreviews(p => [...p, ...previews]);
  };
  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles(p => p.filter((_, i) => i !== idx));
    setImagePreviews(p => p.filter((_, i) => i !== idx));
  };
  const resetForm = () => {
    setForm(initialMarketForm);
    imagePreviews.forEach(u => URL.revokeObjectURL(u));
    setImageFiles([]);
    setImagePreviews([]);
  };

  // query
  const { data: items = [], isLoading } = useQuery<MarketItem[]>({
    queryKey: ["marketplace", { filterCat, filterCond, filterProv, filterShipping, q }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (filterCat !== "__all__") p.set("category", filterCat);
      if (filterCond !== "__all__") p.set("condition", filterCond);
      if (filterProv !== "__all__") p.set("province", filterProv);
      if (filterShipping) p.set("shipping", "true");
      return apiRequest<MarketItem[]>(`/api/marketplace?${p}`);
    },
    staleTime: 30_000,
  });

  // mutations
  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/marketplace", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر إعلانك بنجاح ✅" });
      setAddOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/marketplace/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان" });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.province || !form.city || !form.category) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" }); return;
    }
    const numPrice = Number(form.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "يرجى إدخال سعر صحيح", variant: "destructive" }); return;
    }
    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploadingImgs(true);
      try { uploadedUrls = await Promise.all(imageFiles.map(f => uploadImage(f))); }
      catch { toast({ title: "فشل رفع الصور، حاول مجدداً", variant: "destructive" }); setUploadingImgs(false); return; }
      setUploadingImgs(false);
    }
    createMutation.mutate({
      title: form.title,
      category: form.category,
      condition: form.condition,
      price: numPrice,
      currency: "SYP",
      province: form.province,
      city: form.city,
      phone: form.phone || null,
      shippingAvailable: form.shippingAvailable,
      description: form.description || null,
      images: uploadedUrls,
    });
  };

  const isBusy = createMutation.isPending || uploadingImgs;
  const hasFilters = filterCat !== "__all__" || filterCond !== "__all__" || filterProv !== "__all__" || filterShipping || q;

  return (
    <div className="min-h-full bg-background text-foreground pb-4" dir="rtl">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-l from-orange-600 to-amber-700 text-white px-4 pt-6 pb-5">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none flex items-center justify-center">
          <ShoppingBag size={320} strokeWidth={0.5} color="white" />
        </div>
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <ShoppingBag className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">كل شيء</h1>
            <span className="text-xs bg-white/20 border border-white/40 px-2 py-0.5 rounded-full font-medium animate-pulse">🔥 جديد</span>
          </div>
          <p className="text-orange-100 text-sm mb-4">بيع كل ما تملك — أثاث، ملابس، إلكترونيات وأكثر</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-orange-700 hover:bg-orange-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setAddOpen(true); }}
            >
              <Plus className="w-5 h-5" /> أضف سلعة للبيع
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-orange-500/40 hover:bg-orange-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } navigate("/marketplace-orders"); }}
            >
              <Package className="w-5 h-5" /> طلباتي
            </Button>
          </div>
        </div>
      </div>

      {/* ── Category Chips ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setFilterCat("__all__")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
              filterCat === "__all__"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-background text-foreground border-border hover:border-orange-400"
            )}
          >
            الكل
          </button>
          {MARKETPLACE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? "__all__" : cat)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
                filterCat === cat
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-foreground border-border hover:border-orange-400"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="ابحث في كل شيء..."
            defaultValue={search}
            onInput={e => setSearch((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === "Enter") setQ((e.currentTarget as HTMLInputElement).value); }}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterCond} onValueChange={setFilterCond} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الحالة</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">المحافظة</option>
              {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </NativeSelect>
          </div>
          <button
            onClick={() => setFilterShipping(v => !v)}
            className={cn(
              "shrink-0 h-8 px-2 rounded-lg border text-xs flex items-center gap-1 transition-all active:scale-95",
              filterShipping ? "bg-green-500 text-white border-green-500" : "border-border text-muted-foreground"
            )}
          >
            <Truck className="w-3.5 h-3.5" /> شحن
          </button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0 px-2"
              onClick={() => {
                setFilterCat("__all__"); setFilterCond("__all__"); setFilterProv("__all__");
                setFilterShipping(false); setQ(""); setSearch("");
                if (searchRef.current) searchRef.current.value = "";
              }}>
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* ── Listings ── */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-bold mb-1">لا توجد سلع حالياً</p>
            <p className="text-sm mb-4">كن أول من يبيع شيئاً هنا!</p>
            {user && (
              <Button onClick={() => setAddOpen(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4" /> أضف سلعتك الآن
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(item => (
              <ListingCard
                key={item.id}
                type="marketplace"
                data={item}
                onCardClick={() => navigate(`/marketplace/${item.id}`)}
                onChat={item.sellerId !== user?.id ? () => startChat(item.sellerId, `مرحباً، رأيت إعلانك عن "${item.title}" وأودّ الاستفسار`) : undefined}
                onDelete={user?.id === item.sellerId ? () => {
                  if (window.confirm("هل تريد حذف هذا الإعلان؟ لا يمكن التراجع."))
                    deleteMutation.mutate(item.id);
                } : undefined}
                chatLoading={startingChat}
                deleteLoading={deleteMutation.isPending}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ADD LISTING DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-right text-lg font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" /> إضافة سلعة للبيع
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

            {/* العنوان */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">عنوان الإعلان <span className="text-destructive">*</span></Label>
              <Input
                placeholder="مثال: أريكة جلدية بحالة ممتازة"
                value={form.title}
                onChange={handleInput("title")}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* الفئة */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">الفئة <span className="text-destructive">*</span></Label>
              <BottomSheetSelect value={form.category} onValueChange={v => update("category", v)} placeholder="اختر الفئة">
                {MARKETPLACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </BottomSheetSelect>
            </div>

            {/* الحالة */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">حالة السلعة <span className="text-destructive">*</span></Label>
              <BottomSheetSelect value={form.condition} onValueChange={v => update("condition", v)} placeholder="اختر الحالة">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </BottomSheetSelect>
            </div>

            {/* السعر */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">السعر (ل.س) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="مثال: 50000"
                value={form.price}
                onChange={handleInput("price")}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* المحافظة */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">المحافظة <span className="text-destructive">*</span></Label>
              <BottomSheetSelect value={form.province} onValueChange={v => update("province", v)} placeholder="اختر المحافظة">
                {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </BottomSheetSelect>
            </div>

            {/* المدينة */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">المدينة / الحي <span className="text-destructive">*</span></Label>
              <Input
                placeholder="مثال: المزة، باب توما..."
                value={form.city}
                onChange={handleInput("city")}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* رقم الهاتف */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">رقم للتواصل</Label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="09xxxxxxxx"
                value={form.phone}
                onChange={handleInput("phone")}
                style={{ fontSize: 16 }}
                dir="ltr"
              />
            </div>

            {/* إتاحة الشحن */}
            <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
              <div>
                <p className="text-sm font-semibold">إتاحة الشحن عبر القدموس</p>
                <p className="text-xs text-muted-foreground mt-0.5">السماح للمشترين بطلب الشحن إلى محافظتهم</p>
              </div>
              <button
                type="button"
                onClick={() => update("shippingAvailable", !form.shippingAvailable)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors shrink-0",
                  form.shippingAvailable ? "bg-green-500" : "bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                  form.shippingAvailable ? "translate-x-1" : "translate-x-6"
                )} />
              </button>
            </div>

            {/* الوصف */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">وصف السلعة</Label>
              <Textarea
                placeholder="صف السلعة بالتفصيل: حجمها، لونها، سبب البيع..."
                value={form.description}
                onChange={handleInput("description")}
                rows={4}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* الصور */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">صور السلعة (حتى 8 صور)</Label>
              <ImagePicker previews={imagePreviews} onAdd={addImages} onRemove={removeImage} />
            </div>

          </div>

          <div className="px-5 pb-5 pt-3 shrink-0 border-t">
            <Button
              className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl gap-2"
              onClick={handleSubmit}
              disabled={isBusy}
            >
              {isBusy ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري النشر...</> : <><Plus className="w-5 h-5" /> نشر الإعلان</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
