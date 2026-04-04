// UI_ID: MARKETPLACE_DETAIL_01
import { useRoute, useLocation } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { useSaves } from "@/hooks/use-saves";
import { ShareSheet } from "@/components/ShareSheet";
import { ContactButtons } from "@/components/ContactButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { useToast } from "@/hooks/use-toast";
import { imgUrl } from "@/lib/runtimeConfig";
import { cn } from "@/lib/utils";
import {
  ChevronRight, MapPin, ShoppingBag, Loader2, Heart, MessageCircle,
  Package, Truck, CheckCircle2, Clock, Star, Trash2, ChevronLeft,
  ChevronDown, Phone, Eye, Share2, AlertCircle, Pencil,
} from "lucide-react";

const MARKETPLACE_CATEGORIES = [
  "أثاث ومنزل","ملابس وأحذية","إلكترونيات","أدوات ومعدات",
  "كتب وتعليم","مستلزمات أطفال","فنون وتحف","رياضة وترفيه","أجهزة منزلية","أخرى",
];
const CONDITIONS = ["ممتاز","جيد جداً","جيد","مقبول"];
const SYRIAN_PROVINCES = [
  "دمشق","ريف دمشق","حلب","حمص","حماة","اللاذقية",
  "طرطوس","إدلب","دير الزور","الرقة","الحسكة","درعا","السويداء","القنيطرة",
];

type MarketItem = {
  id: number; sellerId: number; title: string; description: string | null;
  price: string; currency: string; category: string; condition: string;
  images: string[] | null; province: string; city: string; phone: string | null;
  shippingAvailable: boolean; status: string; isFeatured: boolean;
  viewCount: number; createdAt: string;
  sellerName: string | null; sellerPhone: string | null; sellerAvatar: string | null;
};

function formatSYP(n: any) {
  if (!n) return "—";
  return Number(n).toLocaleString("ar-SY") + " ل.س";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    available: { label: "متاح", className: "bg-green-100 text-green-700 border-0" },
    reserved: { label: "محجوز", className: "bg-amber-100 text-amber-700 border-0" },
    sold: { label: "مباع", className: "bg-slate-100 text-slate-600 border-0" },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground border-0" };
  return <Badge className={s.className}>{s.label}</Badge>;
}

function RatingCard() {
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const labels = ["","سيئ","مقبول","جيد","جيد جداً","ممتاز"];
  if (submitted) return (
    <div className="bg-card rounded-3xl border shadow-sm p-5 mb-6 flex flex-col items-center gap-2">
      <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
      <p className="font-bold text-base">شكراً على تقييمك!</p>
      <p className="text-xs text-muted-foreground">تقييمك: {labels[selected]} ({selected}/5)</p>
    </div>
  );
  return (
    <div className="bg-card rounded-3xl border shadow-sm p-5 mb-6">
      <h3 className="font-bold text-base mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> قيّم هذا الإعلان</h3>
      <div className="flex items-center gap-2 justify-center mb-3">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setSelected(n)} className="transition-transform hover:scale-110 active:scale-95">
            <Star className={cn("w-8 h-8 transition-colors", n<=selected ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      {selected > 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-amber-600">{labels[selected]}</p>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white px-6"
            onClick={() => setSubmitted(true)}>إرسال التقييم</Button>
        </div>
      )}
    </div>
  );
}

export default function MarketplaceDetailPage() {
  const [, params] = useRoute<{ id: string }>("/marketplace/:id");
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { startChat, loading: startingChat } = useStartChat();
  const itemId = parseInt(params?.id ?? "0", 10);

  const [imgIdx, setImgIdx] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Buy dialog state
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyStep, setBuyStep] = useState<"details" | "payment">("details");
  const [deliveryType, setDeliveryType] = useState("pickup");
  const [buyPhone, setBuyPhone] = useState("");
  const [buyAddress, setBuyAddress] = useState("");
  const [buyNotes, setBuyNotes] = useState("");
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Load item
  const { data: item, isLoading } = useQuery<MarketItem>({
    queryKey: ["marketplace", itemId],
    queryFn: () => apiRequest<MarketItem>(`/api/marketplace/${itemId}`),
    enabled: !isNaN(itemId) && itemId > 0,
  });

  // Track view
  useEffect(() => {
    if (itemId > 0) apiRequest(`/api/marketplace/${itemId}/view`, "POST").catch(() => {});
  }, [itemId]);

  // Saves
  const { isSaved, toggleSave, isLoading: saveLoading } = useSaves();

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/marketplace/${itemId}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان" });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      navigate("/marketplace");
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  // Place order mutation
  const orderMutation = useMutation({
    mutationFn: (body: object) => apiRequest(`/api/marketplace/${itemId}/order`, "POST", body),
    onSuccess: (data: any) => {
      setCreatedOrder(data);
      setBuyStep("payment");
      qc.invalidateQueries({ queryKey: ["marketplace", itemId] });
      qc.invalidateQueries({ queryKey: ["marketplace-orders"] });
    },
    onError: (err: any) => toast({ title: err?.message || "فشل إنشاء الطلب", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );
  if (!item) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
      <p className="text-lg font-bold">الإعلان غير موجود</p>
      <Button onClick={() => navigate("/marketplace")} variant="outline">العودة للسوق</Button>
    </div>
  );

  const images = (item.images ?? []).filter(u => typeof u === "string" && u.trim() && !u.startsWith("blob:"));
  const isOwner = user?.id === item.sellerId;
  const isAvailable = item.status === "available";
  const shareUrl = `${window.location.origin}/marketplace/${item.id}`;
  const shippingCost = 5000;
  const totalPrice = Number(item.price) + (deliveryType === "shipping" ? shippingCost : 0);

  const handleBuySubmit = () => {
    if (!buyPhone) { toast({ title: "يرجى إدخال رقم هاتفك", variant: "destructive" }); return; }
    if (deliveryType === "shipping" && !buyAddress) { toast({ title: "يرجى إدخال عنوانك للشحن", variant: "destructive" }); return; }
    orderMutation.mutate({
      deliveryType,
      buyerPhone: buyPhone,
      buyerAddress: deliveryType === "shipping" ? buyAddress : null,
      buyerNotes: buyNotes || null,
      buyerName: user?.name || null,
    });
  };

  return (
    <div className="min-h-full bg-background text-foreground pb-24" dir="rtl">

      {/* ── Back Button ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => navigate("/marketplace")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base line-clamp-1 flex-1">{item.title}</h1>
        <StatusBadge status={item.status} />
      </div>

      {/* ── Image Gallery ── */}
      {images.length > 0 ? (
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          <img src={imgUrl(images[imgIdx])} alt={item.title} className="w-full h-full object-cover" />
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-95">
                <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-95">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={cn("block rounded-full transition-all", i === imgIdx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50")} />
                ))}
              </div>
              <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {imgIdx+1}/{images.length}
              </div>
            </>
          )}
          {item.isFeatured && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-amber-500 text-white border-0">⭐ مميز</Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] bg-secondary flex items-center justify-center">
          <ShoppingBag className="w-20 h-20 text-muted-foreground/20" />
        </div>
      )}

      {/* ── Image Thumbnails ── */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
          {images.map((src, i) => (
            <button key={i} onClick={() => setImgIdx(i)}
              className={cn("shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                i === imgIdx ? "border-orange-500" : "border-border")}>
              <img src={imgUrl(src)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">

        {/* ── Title + Price ── */}
        <div className="bg-card rounded-3xl border shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-foreground leading-snug">{item.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">{item.category}</Badge>
                <Badge variant="secondary" className="text-xs">{item.condition}</Badge>
                {item.shippingAvailable && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                    <Truck className="w-3 h-3" /> شحن متاح
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-left shrink-0">
              <p className="text-2xl font-extrabold text-orange-600">{formatSYP(item.price)}</p>
              {item.shippingAvailable && (
                <p className="text-xs text-muted-foreground mt-0.5">+ شحن {formatSYP(shippingCost)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{item.city}، {item.province}</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{item.viewCount} مشاهدة</span>
          </div>
        </div>

        {/* ── Description ── */}
        {item.description && (
          <div className="bg-card rounded-3xl border shadow-sm p-5">
            <h3 className="font-bold text-base mb-3">وصف السلعة</h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{item.description}</p>
          </div>
        )}

        {/* ── Owner Panel ── */}
        {isOwner && (
          <div className="bg-card rounded-3xl border shadow-sm p-5">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" /> لوحة المالك
            </h3>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2 h-11 rounded-xl"
                onClick={() => navigate(`/marketplace-orders?tab=selling`)}>
                <Package className="w-4 h-4" /> الطلبات الواردة
              </Button>
              {!deleteConfirm ? (
                <Button variant="outline"
                  className="flex-1 gap-2 h-11 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => setDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4" /> حذف
                </Button>
              ) : (
                <div className="flex-1 flex gap-2">
                  <Button variant="destructive" size="sm"
                    className="flex-1 h-11 rounded-xl text-xs font-bold"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}>
                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-11 rounded-xl"
                    onClick={() => setDeleteConfirm(false)}>إلغاء</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Seller Info ── */}
        <div className="bg-card rounded-3xl border shadow-sm p-5">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> معلومات البائع
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {item.sellerName?.[0] ?? "؟"}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{item.sellerName ?? "بائع"}</p>
              {item.phone && <p className="text-sm text-muted-foreground" dir="ltr">{item.phone}</p>}
            </div>
          </div>
          {item.phone && (
            <div className="mt-3">
              <ContactButtons phone={item.phone} />
            </div>
          )}
        </div>

        {/* ── Rating ── */}
        {!isOwner && <RatingCard />}

        {/* ── Share ── */}
        <div className="bg-card rounded-3xl border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">شارك الإعلان مع أصدقائك</p>
            <ShareSheet
              options={{ title: item.title, price: item.price, city: item.city, url: shareUrl, description: item.description }}
              className="h-9 px-4 rounded-xl border border-border text-sm font-medium gap-2 flex items-center"
            />
          </div>
        </div>

      </div>

      {/* ── Sticky Bottom Actions (non-owner) ── */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 z-20">
          <div className="max-w-2xl mx-auto flex gap-2">
            {/* حفظ */}
            <button
              onClick={() => { if (!user) { navigate("/login"); return; } toggleSave("marketplace", itemId); }}
              disabled={saveLoading}
              className={cn(
                "w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0",
                isSaved("marketplace", itemId) ? "bg-red-50 border-red-300 text-red-500" : "border-border text-muted-foreground"
              )}
            >
              <Heart className={cn("w-5 h-5", isSaved("marketplace", itemId) && "fill-red-500")} />
            </button>

            {/* مراسلة */}
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-2xl gap-2 font-semibold"
              disabled={startingChat}
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                startChat(item.sellerId, `مرحباً، رأيت إعلانك عن "${item.title}" وأودّ الاستفسار`);
              }}
            >
              {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              مراسلة
            </Button>

            {/* شراء */}
            {isAvailable && (
              <Button
                className="flex-1 h-11 rounded-2xl gap-2 font-bold bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => {
                  if (!user) { navigate("/login"); return; }
                  setBuyStep("details");
                  setBuyOpen(true);
                }}
              >
                <ShoppingBag className="w-4 h-4" /> اشترِ الآن
              </Button>
            )}
            {!isAvailable && (
              <Button disabled className="flex-1 h-11 rounded-2xl" variant="secondary">
                {item.status === "reserved" ? "محجوز" : "مباع"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BUY DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={buyOpen} onOpenChange={open => {
        setBuyOpen(open);
        if (!open) { setBuyStep("details"); setCreatedOrder(null); }
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden" dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}>

          {buyStep === "details" && (
            <>
              <div className="px-5 pt-5 pb-3 shrink-0 border-b">
                <DialogHeader>
                  <DialogTitle className="text-right text-lg font-bold flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-500" /> تفاصيل الطلب
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

                {/* ملخص السلعة */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4">
                  <p className="font-bold text-sm">{item.title}</p>
                  <p className="text-orange-600 font-extrabold text-lg mt-1">{formatSYP(item.price)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.condition} • {item.category}</p>
                </div>

                {/* نوع التسليم */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">طريقة التسليم</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button"
                      onClick={() => setDeliveryType("pickup")}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-sm font-semibold flex flex-col items-center gap-1.5 transition-all active:scale-95",
                        deliveryType === "pickup" ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20" : "border-border"
                      )}>
                      <CheckCircle2 className="w-5 h-5" />
                      استلام شخصي
                      <span className="text-xs font-normal text-muted-foreground">مجاني</span>
                    </button>
                    {item.shippingAvailable && (
                      <button type="button"
                        onClick={() => setDeliveryType("shipping")}
                        className={cn(
                          "p-3 rounded-2xl border-2 text-sm font-semibold flex flex-col items-center gap-1.5 transition-all active:scale-95",
                          deliveryType === "shipping" ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20" : "border-border"
                        )}>
                        <Truck className="w-5 h-5" />
                        شحن القدموس
                        <span className="text-xs font-normal text-muted-foreground">{formatSYP(shippingCost)}</span>
                      </button>
                    )}
                    {!item.shippingAvailable && (
                      <div className="p-3 rounded-2xl border-2 border-border opacity-40 flex flex-col items-center gap-1.5">
                        <Truck className="w-5 h-5" />
                        <span className="text-sm font-semibold">شحن</span>
                        <span className="text-xs text-muted-foreground">غير متاح</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* عنوان التسليم */}
                {deliveryType === "shipping" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">عنوان التسليم <span className="text-destructive">*</span></Label>
                    <Textarea
                      placeholder="أدخل عنوانك بالتفصيل: المحافظة، المدينة، الحي، الشارع..."
                      value={buyAddress}
                      onChange={e => setBuyAddress(e.target.value)}
                      rows={3}
                      style={{ fontSize: 16 }}
                    />
                  </div>
                )}

                {/* رقم الهاتف */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">رقم هاتفك <span className="text-destructive">*</span></Label>
                  <Input
                    type="tel" inputMode="tel"
                    placeholder="09xxxxxxxx"
                    value={buyPhone}
                    onChange={e => setBuyPhone(e.target.value)}
                    dir="ltr"
                    style={{ fontSize: 16 }}
                  />
                </div>

                {/* ملاحظات */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">ملاحظات (اختياري)</Label>
                  <Textarea
                    placeholder="أي تفاصيل إضافية للبائع..."
                    value={buyNotes}
                    onChange={e => setBuyNotes(e.target.value)}
                    rows={2}
                    style={{ fontSize: 16 }}
                  />
                </div>

                {/* الإجمالي */}
                <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">سعر السلعة</span>
                    <span className="font-semibold">{formatSYP(item.price)}</span>
                  </div>
                  {deliveryType === "shipping" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">أجور الشحن (القدموس)</span>
                      <span className="font-semibold">{formatSYP(shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>الإجمالي</span>
                    <span className="text-orange-600">{formatSYP(totalPrice)}</span>
                  </div>
                </div>

              </div>

              <div className="px-5 pb-5 pt-3 shrink-0 border-t">
                <Button
                  className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl gap-2"
                  disabled={orderMutation.isPending}
                  onClick={handleBuySubmit}
                >
                  {orderMutation.isPending
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإنشاء...</>
                    : <><CheckCircle2 className="w-5 h-5" /> تأكيد الطلب</>}
                </Button>
              </div>
            </>
          )}

          {buyStep === "payment" && createdOrder && (
            <>
              <div className="px-5 pt-5 pb-3 shrink-0 border-b">
                <DialogHeader>
                  <DialogTitle className="text-right text-lg font-bold text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> تم إنشاء الطلب!
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                  <p className="text-green-700 font-bold text-base">رقم طلبك: #{createdOrder.id}</p>
                  <p className="text-sm text-green-600 mt-1">تم إشعار البائع بطلبك</p>
                </div>

                <div className="bg-card rounded-2xl border p-5 space-y-3">
                  <h3 className="font-bold text-base">💰 إتمام الدفع عبر شام كاش</h3>
                  <p className="text-sm text-muted-foreground">يرجى إرسال المبلغ التالي إلى حساب شام كاش الخاص بالمنصة:</p>

                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center space-y-2">
                    <p className="text-3xl font-extrabold text-orange-600">{formatSYP(createdOrder.totalPrice)}</p>
                    <p className="text-xs text-muted-foreground">المبلغ الإجمالي (شامل الشحن)</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">رقم الطلب (المرجع)</span>
                      <span className="font-bold font-mono" dir="ltr">#{createdOrder.id}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">اسم الحساب</span>
                      <span className="font-bold">منصة لازمني</span>
                    </div>
                  </div>

                  {/* Barcode placeholder — سيتم استبداله بالباركود الفعلي */}
                  <div className="w-full aspect-square max-w-[200px] mx-auto bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center gap-2 p-4">
                    <div className="grid grid-cols-5 gap-0.5">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={cn("w-full aspect-square rounded-[1px]", (i * 7 + i) % 3 === 0 ? "bg-orange-800" : "bg-transparent")} />
                      ))}
                    </div>
                    <p className="text-xs text-orange-700 font-bold text-center">شام كاش<br/>Sham Cash</p>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">بعد الدفع، توجه إلى "طلباتي" لرفع صورة إيصال الدفع. سيتم مراجعة طلبك خلال 24 ساعة.</p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 shrink-0 border-t space-y-2">
                <Button
                  className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl gap-2"
                  onClick={() => { setBuyOpen(false); navigate("/marketplace-orders"); }}
                >
                  <Package className="w-5 h-5" /> متابعة الطلب ورفع الإيصال
                </Button>
                <Button variant="ghost" className="w-full h-10 text-sm" onClick={() => setBuyOpen(false)}>
                  إغلاق
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
