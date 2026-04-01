// UI_ID: REAL_ESTATE_01
// NAME: العقارات
import { useState, memo } from "react";
import { useLocation } from "wouter";
import { useFormGuard } from "@/hooks/useFormGuard";
import { useScrollFix } from "@/hooks/useScrollFix";
import { useModalGuard } from "@/hooks/useModalGuard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MapPin, Building2, Bed, Ruler, Loader2, Eye, ShoppingCart, MessageCircle, Trash2, Sparkles } from "lucide-react";
import { useStartChat } from "@/hooks/use-start-chat";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BuyRequestCard } from "@/components/BuyRequestCard";

const LISTING_TYPES = ["بيع", "إيجار"];
const SUB_CATEGORIES = ["شقق", "منازل وفيلات", "أراضي", "مكاتب", "محلات تجارية", "مستودعات", "استديو", "غرفة"];

type RealEstate = {
  id: number; sellerId: number; title: string; listingType: string; subCategory: string;
  price: string; area: string | null; rooms: number | null; province: string; city: string;
  images: string[] | null; isFeatured: boolean; viewCount: number; createdAt: string;
  sellerName: string | null;
};

type DetailedRealEstate = RealEstate & {
  phone: string | null; bathrooms: number | null; floor: number | null; location: string | null;
  description: string | null; sellerPhone: string | null;
};

const RE_QK = (p: object) => ["real-estate", p];

const emptyForm = {
  title: "", listingType: "بيع", subCategory: "شقق",
  price: "", currency: "USD", area: "", rooms: "", bathrooms: "", floor: "",
  province: "", city: "", location: "", phone: "", description: "", images: [] as string[],
};

function RealEstatePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  useScrollFix();

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialSub = urlParams.get("subCategory") || "__all__";
  const initialType = urlParams.get("listingType") || "__all__";

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState(initialType);
  const [filterSub, setFilterSub] = useState(initialSub);
  const [filterProv, setFilterProv] = useState("__all__");
  const [tab, setTab] = useState<"listings" | "requests">("listings");
  const [addOpen, setAddOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  // prevent body scroll while any dialog is open
  useModalGuard(addOpen || buyOpen);
  const [detail, setDetail] = useState<DetailedRealEstate | null>(null);
  // useFormGuard: حماية الحقول من إعادة الضبط عند التنقل بين الحقول
  const { form, setForm, updateField } = useFormGuard(emptyForm);
  const [buyForm, setBuyForm] = useState({ propertyType: "شقة", maxPrice: "", currency: "USD", province: "", city: "", description: "" });
  const { startChat, loading: startingChat } = useStartChat();

  const activeType = filterType === "__all__" ? "" : filterType;
  const activeSub = filterSub === "__all__" ? "" : filterSub;
  const activeProv = filterProv === "__all__" ? "" : filterProv;
  const filters = { listingType: activeType, subCategory: activeSub, province: activeProv, q };
  const { data: listings = [], isLoading } = useQuery<RealEstate[]>({
    queryKey: RE_QK(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (activeType) params.set("listingType", activeType);
      if (activeSub) params.set("subCategory", activeSub);
      if (activeProv) params.set("province", activeProv);
      return apiRequest<RealEstate[]>(`/api/real-estate?${params}`);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<DetailedRealEstate>({
    queryKey: ["real-estate-detail", detail?.id],
    queryFn: () => apiRequest<DetailedRealEstate>(`/api/real-estate/${detail?.id}`),
    enabled: !!detail?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/real-estate", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر إعلانك بنجاح" });
      setAddOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["real-estate"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  // ── طلبات شراء العقارات ──────────────────────────────────────
  const { data: buyReqs = [], isLoading: buyLoading } = useQuery({
    queryKey: ["buy-requests", "real-estate"],
    queryFn: () => apiRequest<any[]>("/api/buy-requests?category=real-estate"),
  });
  const buyMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/buy-requests", "POST", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلبك بنجاح وهو بانتظار مراجعة الإدارة" });
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

  // f: wrapper حول updateField للحفاظ على توافق الكود الموجود
  const f = (k: keyof typeof emptyForm, v: string) => updateField(k, v);

  // handleInput: composition-safe — يمنع اختفاء النص العربي أثناء الكتابة
  const handleInput = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if ((e.nativeEvent as InputEvent).isComposing) return;
      updateField(field, e.target.value);
    };

  const handleBuyInput = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if ((e.nativeEvent as InputEvent).isComposing) return;
      setBuyForm(prev => ({ ...prev, [field]: e.target.value }));
    };

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
        bathrooms: form.bathrooms || undefined,
        floor: form.floor || undefined,
        province: form.province,
        city: form.city,
        additionalNotes: form.description || undefined,
      });
      f("description", res.description);
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setAiDescLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.title || !form.price || !form.province || !form.city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" });
      return;
    }
    const numPrice = Number(form.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "يرجى إدخال سعر صحيح", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: form.title, listingType: form.listingType, subCategory: form.subCategory,
      price: numPrice, currency: form.currency, area: form.area || null,
      rooms: form.rooms ? Number(form.rooms) : null, bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      floor: form.floor ? Number(form.floor) : null, province: form.province, city: form.city,
      location: form.location || null, phone: form.phone || null,
      description: form.description || null, images: form.images,
    });
  };

  return (
    <div className="min-h-full bg-background text-foreground pb-4" dir="rtl">

      {/* ── Hero Header ── */}
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

      {/* ── Sticky Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في العقارات..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setQ(search)}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <NativeSelect value={filterType} onValueChange={setFilterType} className="h-8 text-xs min-w-[90px]">
            <option value="__all__">الكل</option>
            {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
          <NativeSelect value={filterSub} onValueChange={setFilterSub} className="h-8 text-xs min-w-[110px]">
            <option value="__all__">الكل</option>
            {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
          <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs min-w-[110px]">
            <option value="__all__">الكل</option>
            {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </NativeSelect>
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
          isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>لا توجد إعلانات عقارية حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map(item => (
                <RealEstateCard key={item.id} item={item} onOpen={() => navigate(`/real-estate/${item.id}`)} />
              ))}
            </div>
          )
        )}

        {tab === "requests" && (
          buyLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (buyReqs as any[]).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-bold mb-2">لا توجد طلبات شراء حالياً</p>
              <p className="text-sm mb-4">هل تبحث عن عقار معين؟ انشر طلبك وسيتواصل معك أصحاب العقارات</p>
              {user && <Button onClick={() => setBuyOpen(true)} className="gap-2"><ShoppingCart className="w-4 h-4" /> نشر طلب شراء</Button>}
            </div>
          ) : (
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

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto" dir="rtl">
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : detailData ? (
            <div className="space-y-4">
              {detailData.images && detailData.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {detailData.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="h-48 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="text-right text-lg">{detailData.title}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detailData.listingType}</Badge>
                <Badge variant="secondary">{detailData.subCategory}</Badge>
              </div>
              <div className="text-2xl font-bold text-primary">{detailData.price}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detailData.area && <InfoRow icon={<Ruler className="w-4 h-4" />} label="المساحة" val={`${detailData.area} م²`} />}
                {detailData.rooms && <InfoRow icon={<Bed className="w-4 h-4" />} label="غرف" val={String(detailData.rooms)} />}
                {detailData.bathrooms && <InfoRow icon={<>🚿</>} label="حمامات" val={String(detailData.bathrooms)} />}
                {detailData.floor !== null && detailData.floor !== undefined && <InfoRow icon={<>🏢</>} label="الطابق" val={String(detailData.floor)} />}
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="الموقع" val={`${detailData.province} - ${detailData.city}`} />
              </div>
              {detailData.description && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">{detailData.description}</div>
              )}
              <div className="border-t pt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{detailData.sellerName || "البائع"}</p>
                  {(detailData.phone || detailData.sellerPhone) && (
                    <p className="text-sm text-muted-foreground">📞 {detailData.phone || detailData.sellerPhone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {(detailData.phone || detailData.sellerPhone) && (
                    <a href={`tel:${detailData.phone || detailData.sellerPhone}`}>
                      <Button size="sm" variant="outline">📞 اتصال</Button>
                    </a>
                  )}
                  {user && detailData.sellerId !== user.id && (
                    <Button size="sm" onClick={() => { startChat(detailData.sellerId); setDetail(null); }}>
                      💬 محادثة
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Add Dialog ── Bug 3 fix: max-h-[85dvh] + proper scroll wrapper */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" dir="rtl"
          style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}>
          <div className="px-6 pt-6 pb-2 shrink-0 border-b">
            <DialogHeader><DialogTitle className="text-right">نشر إعلان عقاري</DialogTitle></DialogHeader>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1"
            style={{ WebkitOverflowScrolling: "touch" }}>

            <div>
              <Label>العنوان *</Label>
              {/* Bug 1 fix: fontSize 16 prevents iOS zoom, dir="auto" handles Arabic */}
              <Input
                dir="auto"
                placeholder="مثال: شقة للبيع في دمشق - المزة"
                value={form.title}
                onChange={handleInput("title")}
                onCompositionEnd={e => updateField("title", e.currentTarget.value)}
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع الإعلان *</Label>
                {/* Bug 2 fix: BottomSheetSelect instead of NativeSelect in dialogs */}
                <BottomSheetSelect value={form.listingType} onValueChange={v => f("listingType", v)} placeholder="نوع الإعلان">
                  {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label>الفئة *</Label>
                <BottomSheetSelect value={form.subCategory} onValueChange={v => f("subCategory", v)} placeholder="الفئة">
                  {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </BottomSheetSelect>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>السعر *</Label>
                <Input
                  type="number"
                  placeholder="السعر"
                  value={form.price}
                  onChange={e => f("price", e.target.value)}
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <Label>العملة</Label>
                <BottomSheetSelect value={form.currency} onValueChange={v => f("currency", v)} placeholder="العملة">
                  <option value="USD">USD</option>
                  <option value="SYP">SYP</option>
                </BottomSheetSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المساحة (م²)</Label>
                <Input type="number" placeholder="المساحة" value={form.area} onChange={e => f("area", e.target.value)} style={{ fontSize: 16 }} />
              </div>
              <div>
                <Label>عدد الغرف</Label>
                <Input type="number" placeholder="الغرف" value={form.rooms} onChange={e => f("rooms", e.target.value)} style={{ fontSize: 16 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>عدد الحمامات</Label>
                <Input type="number" placeholder="الحمامات" value={form.bathrooms} onChange={e => f("bathrooms", e.target.value)} style={{ fontSize: 16 }} />
              </div>
              <div>
                <Label>رقم الطابق</Label>
                <Input type="number" placeholder="الطابق" value={form.floor} onChange={e => f("floor", e.target.value)} style={{ fontSize: 16 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المحافظة *</Label>
                <BottomSheetSelect value={form.province} onValueChange={v => f("province", v)} placeholder="اختر المحافظة">
                  {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label>المدينة *</Label>
                <Input
                  dir="auto"
                  placeholder="المدينة أو الحي"
                  value={form.city}
                  onChange={handleInput("city")}
                  onCompositionEnd={e => updateField("city", e.currentTarget.value)}
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            <div>
              <Label>تفاصيل الموقع</Label>
              <Input
                dir="auto"
                placeholder="مثال: قرب مسجد الروضة، شارع الثورة"
                value={form.location}
                onChange={handleInput("location")}
                onCompositionEnd={e => updateField("location", e.currentTarget.value)}
                style={{ fontSize: 16 }}
              />
            </div>

            <div>
              <Label>رقم الهاتف / واتساب</Label>
              <Input
                type="tel"
                placeholder="مثال: 0991234567"
                value={form.phone}
                onChange={handleInput("phone")}
                onCompositionEnd={e => updateField("phone", e.currentTarget.value)}
                style={{ fontSize: 16 }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>الوصف</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 px-2" onClick={handleAiDescription} disabled={aiDescLoading}>
                  {aiDescLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  كتابة بالذكاء الاصطناعي
                </Button>
              </div>
              <Textarea
                dir="auto"
                placeholder="وصف تفصيلي للعقار..."
                value={form.description}
                onChange={handleInput("description")}
                onCompositionEnd={e => updateField("description", e.currentTarget.value)}
                rows={3}
                style={{ fontSize: 16 }}
              />
            </div>

            <div>
              <Label>الصور</Label>
              {/* Bug 4 fix: MultiImageUpload now shows local preview instantly */}
              <MultiImageUpload images={form.images} onChange={imgs => setForm(p => ({ ...p, images: imgs }))} />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              نشر الإعلان
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Buy Request Dialog ── */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" dir="rtl"
          style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}>
          <div className="px-6 pt-6 pb-2 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">طلب شراء عقار</DialogTitle>
            </DialogHeader>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1"
            style={{ WebkitOverflowScrolling: "touch" }}>

            <div>
              <Label>نوع العقار المطلوب *</Label>
              <BottomSheetSelect value={buyForm.propertyType} onValueChange={v => setBuyForm(p => ({ ...p, propertyType: v }))} placeholder="نوع العقار">
                {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </BottomSheetSelect>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>الميزانية القصوى</Label>
                <Input
                  type="number"
                  placeholder="أعلى سعر مقبول"
                  style={{ fontSize: 16 }}
                  value={buyForm.maxPrice}
                  onChange={e => setBuyForm(p => ({ ...p, maxPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label>العملة</Label>
                <BottomSheetSelect value={buyForm.currency} onValueChange={v => setBuyForm(p => ({ ...p, currency: v }))} placeholder="العملة">
                  <option value="USD">USD</option>
                  <option value="SYP">SYP</option>
                </BottomSheetSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المحافظة *</Label>
                <BottomSheetSelect value={buyForm.province} onValueChange={v => setBuyForm(p => ({ ...p, province: v }))} placeholder="اختر المحافظة">
                  {SYRIAN_PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label>المدينة / الحي *</Label>
                <Input
                  dir="auto"
                  placeholder="مثال: المزة، المهاجرين"
                  style={{ fontSize: 16 }}
                  value={buyForm.city}
                  onChange={handleBuyInput("city")}
                  onCompositionEnd={e => setBuyForm(p => ({ ...p, city: e.currentTarget.value }))}
                />
              </div>
            </div>

            <div>
              <Label>تفاصيل إضافية</Label>
              <Textarea
                dir="auto"
                placeholder="مثال: أبحث عن شقة بغرفتين قرب مدرسة، لا تزيد عن الطابق الخامس..."
                rows={3}
                style={{ fontSize: 16 }}
                value={buyForm.description}
                onChange={handleBuyInput("description")}
                onCompositionEnd={e => setBuyForm(p => ({ ...p, description: e.currentTarget.value }))}
              />
            </div>

            <Button className="w-full gap-2 bg-teal-700 hover:bg-teal-800" onClick={handleBuySubmit} disabled={buyMutation.isPending}>
              {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              إرسال طلب الشراء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RealEstateCard({ item, onOpen }: { item: RealEstate; onOpen: () => void }) {
  const img = item.images?.[0];
  return (
    <div
      className={cn("bg-card border border-border/60 rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors", item.isFeatured && "border-yellow-500/50")}
      onClick={onOpen}
    >
      <div className="relative">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-muted flex items-center justify-center">
            <Building2 className="w-12 h-12 opacity-30" />
          </div>
        )}
        {item.isFeatured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs">مميز ⭐</Badge>
        )}
        <Badge className="absolute top-2 left-2 text-xs" variant="secondary">{item.listingType}</Badge>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm line-clamp-1 mb-1">{item.title}</p>
        <p className="text-primary font-bold mb-2">{item.price}</p>
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
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{val}</span>
    </div>
  );
}

export default memo(RealEstatePage);
