// UI_ID: REAL_ESTATE_01 — CLEAN REBUILD
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useStartChat } from "@/hooks/use-start-chat";
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
  Search, Plus, MapPin, Building2, Bed, Ruler, Loader2, Eye,
  ShoppingCart, Trash2, Sparkles, ImagePlus, X, Phone, MessageCircle,
} from "lucide-react";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BuyRequestCard } from "@/components/BuyRequestCard";

const LISTING_TYPES = ["بيع", "إيجار"];
const SUB_CATEGORIES = ["شقق", "منازل وفيلات", "أراضي", "مكاتب", "محلات تجارية", "مستودعات", "استديو", "غرفة"];

// ── initialForm defined OUTSIDE component — never recreated on render ────────
const initialRealEstateForm = {
  title: "",
  listingType: "بيع",
  subCategory: "شقق",
  price: "",
  currency: "USD",
  area: "",
  rooms: "",
  bathrooms: "",
  floor: "",
  province: "",
  city: "",
  location: "",
  phone: "",
  description: "",
};

type RealEstate = {
  id: number; sellerId: number; title: string; listingType: string; subCategory: string;
  price: string; area: string | null; rooms: number | null; province: string; city: string;
  images: string[] | null; isFeatured: boolean; viewCount: number; createdAt: string;
  sellerName: string | null;
};

// ── Helper: upload a single image file ──────────────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(import.meta.env.BASE_URL + "api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("upload failed");
  const data = await res.json();
  return data.url as string;
}

// ── Image preview strip (inline, no custom hooks) ───────────────────────────
function ImagePicker({
  previews, onAdd, onRemove,
}: {
  previews: string[];
  onAdd: (files: FileList) => void;
  onRemove: (idx: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-border shrink-0">
            <img src={src} className="w-full h-full object-cover" alt="" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {previews.length < 8 && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs">إضافة</span>
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) { onAdd(e.target.files); e.target.value = ""; } }}
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RealEstatePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { startChat, loading: startingChat } = useStartChat();

  // Filter state
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("__all__");
  const [filterSub, setFilterSub] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [tab, setTab] = useState<"listings" | "requests">("listings");
  const [addOpen, setAddOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  // ── form — initialRealEstateForm defined OUTSIDE (never recreated) ─────────
  const [form, setForm] = useState(initialRealEstateForm);
  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  console.log("FORM STATE:", form);

  // ── Image system — File[] locally, blob preview, upload on submit ────────
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
    setForm(initialRealEstateForm);
    imagePreviews.forEach(u => URL.revokeObjectURL(u));
    setImageFiles([]);
    setImagePreviews([]);
  };

  // ── Buy request form ─────────────────────────────────────────────────────
  const [buyForm, setBuyForm] = useState({
    propertyType: "شقة", maxPrice: "", currency: "USD", province: "", city: "", description: "",
  });
  const updateBuy = (k: string, v: string) => setBuyForm(prev => ({ ...prev, [k]: v }));

  // ── AI description ────────────────────────────────────────────────────────
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const handleAiDescription = async () => {
    if (!form.subCategory || !form.province) {
      toast({ title: "يرجى تحديد نوع العقار والمحافظة أولاً", variant: "destructive" });
      return;
    }
    setAiDescLoading(true);
    try {
      const res = await apiRequest<{ description: string }>("/api/real-estate/ai-description", "POST", {
        title: form.title || `${form.subCategory} للـ${form.listingType}`,
        listingType: form.listingType,
        subCategory: form.subCategory,
        area: form.area || undefined,
        rooms: form.rooms || undefined,
        province: form.province,
        city: form.city || undefined,
      });
      update("description", res.description);
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const activeType = filterType === "__all__" ? "" : filterType;
  const activeSub = filterSub === "__all__" ? "" : filterSub;
  const activeProv = filterProv === "__all__" ? "" : filterProv;

  const { data: listings = [], isLoading } = useQuery<RealEstate[]>({
    queryKey: ["real-estate", { activeType, activeSub, activeProv, q }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (activeType) p.set("listingType", activeType);
      if (activeSub) p.set("subCategory", activeSub);
      if (activeProv) p.set("province", activeProv);
      return apiRequest<RealEstate[]>(`/api/real-estate?${p}`);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: buyReqs = [], isLoading: buyLoading } = useQuery({
    queryKey: ["buy-requests", "real-estate"],
    queryFn: () => apiRequest<any[]>("/api/buy-requests?category=real-estate"),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/real-estate", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر إعلانك بنجاح" });
      setAddOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["real-estate"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const buyMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/buy-requests", "POST", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلبك بنجاح" });
      setBuyOpen(false);
      setBuyForm({ propertyType: "شقة", maxPrice: "", currency: "USD", province: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: ["buy-requests", "real-estate"] });
    },
    onError: () => toast({ title: "فشل إرسال الطلب", variant: "destructive" }),
  });

  const deleteBuyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buy-requests", "real-estate"] }),
  });

  // ── Submit listing (upload images first) ─────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.province || !form.city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية (العنوان، السعر، المحافظة، المدينة)", variant: "destructive" });
      return;
    }
    const numPrice = Number(form.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "يرجى إدخال سعر صحيح", variant: "destructive" });
      return;
    }
    // Upload images
    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploadingImgs(true);
      try {
        uploadedUrls = await Promise.all(imageFiles.map(f => uploadImage(f)));
      } catch {
        toast({ title: "فشل رفع بعض الصور، حاول مجدداً", variant: "destructive" });
        setUploadingImgs(false);
        return;
      }
      setUploadingImgs(false);
    }
    createMutation.mutate({
      title: form.title,
      listingType: form.listingType,
      subCategory: form.subCategory,
      price: numPrice,
      currency: form.currency,
      area: form.area || null,
      rooms: form.rooms ? Number(form.rooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      floor: form.floor ? Number(form.floor) : null,
      province: form.province,
      city: form.city,
      location: form.location || null,
      phone: form.phone || null,
      description: form.description || null,
      images: uploadedUrls,
    });
  };

  const handleBuySubmit = () => {
    if (!buyForm.province || !buyForm.city) {
      toast({ title: "يرجى تحديد المحافظة والمدينة", variant: "destructive" });
      return;
    }
    buyMutation.mutate({
      brand: buyForm.propertyType,
      maxPrice: buyForm.maxPrice ? Number(buyForm.maxPrice) : null,
      currency: buyForm.currency,
      city: buyForm.city,
      description: `المحافظة: ${buyForm.province}${buyForm.description ? `\n${buyForm.description}` : ""}`,
      category: "real-estate",
    });
  };

  const isBusy = createMutation.isPending || uploadingImgs;

  return (
    <div className="min-h-full bg-background text-foreground pb-4" dir="rtl">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-l from-cyan-700 to-teal-900 text-white px-4 pt-6 pb-5">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none flex items-center justify-center">
          <Building2 size={320} strokeWidth={0.5} color="white" />
        </div>
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">العقارات</h1>
          </div>
          <p className="text-cyan-100 text-sm mb-4">شقق، منازل، أراضي وعقارات تجارية في سورية</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-teal-800 hover:bg-teal-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setAddOpen(true); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان عقاري
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-teal-500/40 hover:bg-teal-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } setBuyOpen(true); }}
            >
              <ShoppingCart className="w-5 h-5" /> طلب شراء عقار
            </Button>
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في العقارات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setQ(search)}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div style={{ flexShrink: 0, width: 100 }}>
            <NativeSelect value={filterType} onValueChange={setFilterType} className="h-8 text-xs" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </div>
          <div style={{ flexShrink: 0, width: 120 }}>
            <NativeSelect value={filterSub} onValueChange={setFilterSub} className="h-8 text-xs" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </div>
          <div style={{ flexShrink: 0, width: 115 }}>
            <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </NativeSelect>
          </div>
          {(activeType || activeSub || activeProv || q) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0"
              onClick={() => { setFilterType("__all__"); setFilterSub("__all__"); setFilterProv("__all__"); setQ(""); setSearch(""); }}>
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b px-4">
        <button
          className={cn("flex-1 pb-3 pt-3 text-sm font-semibold transition-colors", tab === "listings" ? "text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400" : "text-muted-foreground")}
          onClick={() => setTab("listings")}
        >
          إعلانات العقارات {listings.length > 0 && <span className="mr-1 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 rounded-full px-2 py-0.5">{listings.length}</span>}
        </button>
        <button
          className={cn("flex-1 pb-3 pt-3 text-sm font-semibold transition-colors", tab === "requests" ? "text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400" : "text-muted-foreground")}
          onClick={() => setTab("requests")}
        >
          طلبات الشراء {(buyReqs as any[]).length > 0 && <span className="mr-1 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 rounded-full px-2 py-0.5">{(buyReqs as any[]).length}</span>}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        {tab === "listings" && (
          isLoading
            ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : listings.length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>لا توجد إعلانات عقارية حالياً</p>
                </div>
              )
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings.map(item => (
                    <RealEstateCard key={item.id} item={item} onOpen={() => navigate(`/real-estate/${item.id}`)} />
                  ))}
                </div>
              )
        )}

        {tab === "requests" && (
          buyLoading
            ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : (buyReqs as any[]).length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-bold mb-2">لا توجد طلبات شراء حالياً</p>
                  <p className="text-sm mb-4">هل تبحث عن عقار معين؟ انشر طلبك وسيتواصل معك أصحاب العقارات</p>
                  {user && <Button onClick={() => setBuyOpen(true)} className="gap-2"><ShoppingCart className="w-4 h-4" /> نشر طلب شراء</Button>}
                </div>
              )
              : (
                <div className="flex flex-col gap-3">
                  {(buyReqs as any[]).map((req: any) => (
                    <BuyRequestCard
                      key={req.id}
                      data={{ ...req, type: req.brand || "عقار" }}
                      currentUserId={user?.id}
                      accentColor="cyan"
                      label="طلب شراء عقار"
                      onChat={user && req.userId !== user.id ? () => startChat(req.userId, `مرحباً، لديّ عقار قد يناسب طلبك`) : undefined}
                      chatLoading={startingChat}
                      onDelete={user && req.userId === user.id ? () => deleteBuyMutation.mutate(req.id) : undefined}
                      deleteLoading={deleteBuyMutation.isPending}
                    />
                  ))}
                </div>
              )
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ADD LISTING DIALOG — clean form, no guards, no composition
      ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}
      >
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-right text-lg font-bold">نشر إعلان عقاري</DialogTitle>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

            {/* العنوان */}
            <div>
              <Label className="mb-1 block">العنوان *</Label>
              <Input
                value={form.title || ""}
                onChange={e => update("title", e.target.value)}
                placeholder="مثال: شقة للبيع في دمشق - المزة"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* نوع + فئة */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">نوع الإعلان *</Label>
                <BottomSheetSelect value={form.listingType || ""} onValueChange={v => update("listingType", v)} placeholder="النوع">
                  {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">الفئة *</Label>
                <BottomSheetSelect value={form.subCategory || ""} onValueChange={v => update("subCategory", v)} placeholder="الفئة">
                  {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </BottomSheetSelect>
              </div>
            </div>

            {/* السعر + العملة */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="mb-1 block">السعر *</Label>
                <Input
                  type="number"
                  value={form.price || ""}
                  onChange={e => update("price", e.target.value)}
                  placeholder="السعر"
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <Label className="mb-1 block">العملة</Label>
                <BottomSheetSelect value={form.currency || ""} onValueChange={v => update("currency", v)} placeholder="USD">
                  <option value="USD">USD</option>
                  <option value="SYP">SYP</option>
                </BottomSheetSelect>
              </div>
            </div>

            {/* المساحة + الغرف */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المساحة (م²)</Label>
                <Input type="number" value={form.area || ""} onChange={e => update("area", e.target.value)} placeholder="المساحة" style={{ fontSize: 16 }} />
              </div>
              <div>
                <Label className="mb-1 block">عدد الغرف</Label>
                <Input type="number" value={form.rooms || ""} onChange={e => update("rooms", e.target.value)} placeholder="الغرف" style={{ fontSize: 16 }} />
              </div>
            </div>

            {/* الحمامات + الطابق */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">عدد الحمامات</Label>
                <Input type="number" value={form.bathrooms || ""} onChange={e => update("bathrooms", e.target.value)} placeholder="الحمامات" style={{ fontSize: 16 }} />
              </div>
              <div>
                <Label className="mb-1 block">رقم الطابق</Label>
                <Input type="number" value={form.floor || ""} onChange={e => update("floor", e.target.value)} placeholder="الطابق" style={{ fontSize: 16 }} />
              </div>
            </div>

            {/* المحافظة + المدينة */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المحافظة *</Label>
                <BottomSheetSelect value={form.province || ""} onValueChange={v => update("province", v)} placeholder="اختر المحافظة">
                  {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">المدينة *</Label>
                <Input
                  value={form.city || ""}
                  onChange={e => update("city", e.target.value)}
                  placeholder="المدينة أو الحي"
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            {/* تفاصيل الموقع */}
            <div>
              <Label className="mb-1 block">تفاصيل الموقع</Label>
              <Input
                value={form.location || ""}
                onChange={e => update("location", e.target.value)}
                placeholder="مثال: قرب مسجد الروضة، شارع الثورة"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <Label className="mb-1 block">رقم الهاتف / واتساب</Label>
              <Input
                type="tel"
                value={form.phone || ""}
                onChange={e => update("phone", e.target.value)}
                placeholder="مثال: 0991234567"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* الوصف */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>الوصف</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 px-2" onClick={handleAiDescription} disabled={aiDescLoading}>
                  {aiDescLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  كتابة بالذكاء الاصطناعي
                </Button>
              </div>
              <Textarea
                value={form.description || ""}
                onChange={e => update("description", e.target.value)}
                placeholder="وصف تفصيلي للعقار..."
                rows={3}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* الصور — inline image picker */}
            <div>
              <Label className="mb-2 block">الصور</Label>
              <ImagePicker
                previews={imagePreviews}
                onAdd={addImages}
                onRemove={removeImage}
              />
              {imageFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{imageFiles.length} صورة — سيتم رفعها عند النشر</p>
              )}
            </div>

            <Button
              className="w-full h-12 text-base font-bold"
              onClick={handleSubmit}
              disabled={isBusy}
            >
              {isBusy
                ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />{uploadingImgs ? "جارٍ رفع الصور..." : "جارٍ النشر..."}</>
                : "نشر الإعلان"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          BUY REQUEST DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">طلب شراء عقار</DialogTitle>
            </DialogHeader>
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

            <div>
              <Label className="mb-1 block">نوع العقار المطلوب *</Label>
              <BottomSheetSelect value={buyForm.propertyType || ""} onValueChange={v => updateBuy("propertyType", v)} placeholder="نوع العقار">
                {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </BottomSheetSelect>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="mb-1 block">الميزانية القصوى</Label>
                <Input type="number" value={buyForm.maxPrice || ""} onChange={e => updateBuy("maxPrice", e.target.value)} placeholder="أعلى سعر" style={{ fontSize: 16 }} />
              </div>
              <div>
                <Label className="mb-1 block">العملة</Label>
                <BottomSheetSelect value={buyForm.currency || ""} onValueChange={v => updateBuy("currency", v)} placeholder="USD">
                  <option value="USD">USD</option>
                  <option value="SYP">SYP</option>
                </BottomSheetSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المحافظة *</Label>
                <BottomSheetSelect value={buyForm.province || ""} onValueChange={v => updateBuy("province", v)} placeholder="اختر المحافظة">
                  {SYRIAN_PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">المدينة / الحي *</Label>
                <Input value={buyForm.city || ""} onChange={e => updateBuy("city", e.target.value)} placeholder="مثال: المزة، المهاجرين" style={{ fontSize: 16 }} />
              </div>
            </div>

            <div>
              <Label className="mb-1 block">تفاصيل إضافية</Label>
              <Textarea value={buyForm.description || ""} onChange={e => updateBuy("description", e.target.value)} placeholder="مثال: أبحث عن شقة بغرفتين..." rows={3} style={{ fontSize: 16 }} />
            </div>

            <Button className="w-full gap-2 bg-teal-700 hover:bg-teal-800 h-12 text-base font-bold" onClick={handleBuySubmit} disabled={buyMutation.isPending}>
              {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              إرسال طلب الشراء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Real estate card ──────────────────────────────────────────────────────────
function RealEstateCard({ item, onOpen }: { item: RealEstate; onOpen: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const img = item.images?.find(
    u => typeof u === "string" && u.trim().length > 0 && !u.startsWith("blob:")
  ) ?? null;
  const formattedPrice = item.price ? `$${Number(item.price).toLocaleString("en-US")}` : "";
  return (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-md transition-all",
        item.isFeatured && "border-yellow-500/50"
      )}
      onClick={onOpen}
    >
      <div className="relative">
        {img && !imgErr ? (
          <img src={img} alt={item.title} className="w-full h-44 object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-44 bg-muted flex items-center justify-center">
            <Building2 className="w-12 h-12 opacity-30" />
          </div>
        )}
        {item.isFeatured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold shadow">مميز ⭐</Badge>
        )}
        <Badge className="absolute top-2 left-2 text-xs" variant="secondary">{item.listingType}</Badge>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm line-clamp-2 mb-1">{item.title}</p>
        {formattedPrice && <p className="text-primary font-bold text-base mb-2">{formattedPrice}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.province}</span>
          {item.area && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{item.area} م²</span>}
          {item.rooms && <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{item.rooms} غرف</span>}
          <span className="flex items-center gap-1 mr-auto"><Eye className="w-3 h-3" />{item.viewCount}</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{val}</span>
    </div>
  );
}
