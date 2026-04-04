// UI_ID: MARKETPLACE_ORDERS_01
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { imgUrl } from "@/lib/runtimeConfig";
import { cn } from "@/lib/utils";
import {
  Package, Loader2, Upload, X, ChevronLeft, ShoppingBag,
  CheckCircle2, Clock, Truck, XCircle, AlertCircle, Image as ImageIcon,
} from "lucide-react";

type Order = {
  id: number; itemId: number; itemTitle: string | null; itemImages: string[] | null;
  buyerId: number; sellerId: number; buyerName: string | null; sellerName: string | null;
  status: string; totalPrice: string; deliveryType: string;
  buyerPhone: string | null; buyerAddress: string | null;
  receiptImageUrl: string | null; trackingNumber: string | null;
  createdAt: string;
};

type Tab = "buying" | "selling";

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_payment:   { label: "في انتظار الدفع",      color: "amber",  icon: <Clock className="w-4 h-4" /> },
  payment_uploaded:  { label: "إيصال مرفوع للمراجعة", color: "blue",   icon: <Upload className="w-4 h-4" /> },
  payment_confirmed: { label: "تم تأكيد الدفع",       color: "green",  icon: <CheckCircle2 className="w-4 h-4" /> },
  preparing:         { label: "يُحضّر البائع",          color: "violet", icon: <Package className="w-4 h-4" /> },
  shipped:           { label: "في الطريق (القدموس)",   color: "blue",   icon: <Truck className="w-4 h-4" /> },
  delivered:         { label: "تم التسليم",            color: "green",  icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled:         { label: "ملغى",                  color: "red",    icon: <XCircle className="w-4 h-4" /> },
  rejected:          { label: "مرفوض",                 color: "red",    icon: <XCircle className="w-4 h-4" /> },
};

function colorClass(color: string, type: "bg" | "text" | "border") {
  const map: Record<string, Record<string, string>> = {
    amber:  { bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-400",  border: "border-amber-300" },
    blue:   { bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400",    border: "border-blue-300" },
    green:  { bg: "bg-green-100 dark:bg-green-900/30",  text: "text-green-700 dark:text-green-400",  border: "border-green-300" },
    violet: { bg: "bg-violet-100 dark:bg-violet-900/30",text: "text-violet-700 dark:text-violet-400",border: "border-violet-300" },
    red:    { bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-400",      border: "border-red-300" },
  };
  return map[color]?.[type] ?? "";
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_INFO[status] ?? { label: status, color: "amber", icon: null };
  return (
    <Badge className={cn("gap-1 border-0 text-xs font-semibold", colorClass(s.color, "bg"), colorClass(s.color, "text"))}>
      {s.icon}{s.label}
    </Badge>
  );
}

function formatSYP(n: any) {
  if (!n) return "—";
  return Number(n).toLocaleString("ar-SY") + " ل.س";
}

async function uploadReceipt(file: File, orderId: number): Promise<string> {
  const token = localStorage.getItem("scm_token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(import.meta.env.BASE_URL + `api/upload-image?folder=receipts`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("upload failed");
  const data = await res.json();
  if (!data.success || !data.url) throw new Error("upload failed");
  return data.url as string;
}

function OrderCard({ order, tab, onUploadReceipt, onCancel }: {
  order: Order;
  tab: Tab;
  onUploadReceipt: (orderId: number) => void;
  onCancel: (orderId: number) => void;
}) {
  const thumb = order.itemImages?.[0];
  const statusInfo = STATUS_INFO[order.status] ?? { label: order.status, color: "amber", icon: null };
  const canUpload = tab === "buying" && order.status === "pending_payment";
  const canCancel = tab === "buying" && ["pending_payment", "payment_uploaded"].includes(order.status);
  const hasTracking = order.trackingNumber;

  return (
    <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={cn("px-4 py-2 flex items-center gap-2 border-b", colorClass(statusInfo.color, "bg"))}>
        <span className={colorClass(statusInfo.color, "text")}>{statusInfo.icon}</span>
        <span className={cn("text-xs font-bold flex-1", colorClass(statusInfo.color, "text"))}>{statusInfo.label}</span>
        <span className="text-xs text-muted-foreground">#{order.id}</span>
      </div>

      <div className="p-4 flex gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-secondary flex-shrink-0">
          {thumb
            ? <img src={imgUrl(thumb)} alt="" className="w-full h-full object-cover" />
            : <ShoppingBag className="w-6 h-6 text-muted-foreground/30 m-auto mt-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm line-clamp-2">{order.itemTitle ?? "سلعة"}</p>
          <p className="text-orange-600 font-bold text-base mt-0.5">{formatSYP(order.totalPrice)}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{order.deliveryType === "shipping" ? "🚚 شحن" : "📍 استلام شخصي"}</span>
            {tab === "buying" && <span>البائع: {order.sellerName ?? "—"}</span>}
            {tab === "selling" && <span>المشتري: {order.buyerName ?? "—"}</span>}
          </div>
          {hasTracking && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <Truck className="w-3.5 h-3.5" />
              <span>رقم التتبع: <span dir="ltr" className="font-mono">{order.trackingNumber}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Receipt preview */}
      {order.receiptImageUrl && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-green-600" />
          <a href={imgUrl(order.receiptImageUrl)} target="_blank" rel="noreferrer"
            className="text-xs text-green-600 font-medium underline">
            عرض إيصال الدفع
          </a>
        </div>
      )}

      {/* Buyer address */}
      {tab === "selling" && order.buyerAddress && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">عنوان التسليم:</p>
          <p className="text-xs font-medium">{order.buyerAddress}</p>
        </div>
      )}

      {/* Actions */}
      {(canUpload || canCancel) && (
        <div className="px-4 pb-4 flex gap-2">
          {canUpload && (
            <Button
              className="flex-1 h-10 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl gap-2"
              onClick={() => onUploadReceipt(order.id)}
            >
              <Upload className="w-4 h-4" /> رفع إيصال الدفع
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              className="h-10 text-sm rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => onCancel(order.id)}
            >
              إلغاء
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceOrdersPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("buying");

  // Upload receipt dialog
  const [uploadOrderId, setUploadOrderId] = useState<number | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery<Order[]>({
    queryKey: ["marketplace-orders", "buying"],
    queryFn: () => apiRequest<Order[]>("/api/marketplace-orders/buying"),
    enabled: !!user,
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery<Order[]>({
    queryKey: ["marketplace-orders", "selling"],
    queryFn: () => apiRequest<Order[]>("/api/marketplace-orders/selling"),
    enabled: !!user,
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => apiRequest(`/api/marketplace-orders/${orderId}/cancel`, "PATCH"),
    onSuccess: () => {
      toast({ title: "تم إلغاء الطلب" });
      qc.invalidateQueries({ queryKey: ["marketplace-orders"] });
    },
    onError: () => toast({ title: "فشل الإلغاء", variant: "destructive" }),
  });

  const handleCancel = (orderId: number) => {
    if (window.confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) {
      cancelMutation.mutate(orderId);
    }
  };

  // Upload receipt
  const openUpload = (orderId: number) => {
    setUploadOrderId(orderId);
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const submitReceipt = async () => {
    if (!receiptFile || !uploadOrderId) return;
    setUploading(true);
    try {
      const url = await uploadReceipt(receiptFile, uploadOrderId);
      await apiRequest(`/api/marketplace/orders/${uploadOrderId}/receipt`, "POST", { receiptImageUrl: url });
      toast({ title: "تم رفع الإيصال بنجاح ✅" });
      qc.invalidateQueries({ queryKey: ["marketplace-orders"] });
      setUploadOrderId(null);
    } catch {
      toast({ title: "فشل رفع الإيصال", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <Package className="w-16 h-16 text-muted-foreground/30" />
      <p className="text-lg font-bold">يجب تسجيل الدخول أولاً</p>
      <Button onClick={() => navigate("/login")} className="bg-orange-500 hover:bg-orange-600 text-white">تسجيل الدخول</Button>
    </div>
  );

  const orders = tab === "buying" ? purchases : sales;
  const isLoading = tab === "buying" ? loadingPurchases : loadingSales;

  return (
    <div className="min-h-full bg-background text-foreground pb-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => navigate("/marketplace")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">طلباتي</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(["buying", "selling"] as Tab[]).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors border-b-2",
              tab === t ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"
            )}>
            {t === "buying" ? `مشترياتي (${purchases.length})` : `مبيعاتي (${sales.length})`}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-bold mb-1">
              {tab === "buying" ? "لا توجد مشتريات بعد" : "لا توجد مبيعات بعد"}
            </p>
            <p className="text-sm mb-4">
              {tab === "buying" ? "تصفّح السوق وابدأ بالشراء!" : "انشر سلعة وابدأ بالبيع!"}
            </p>
            <Button onClick={() => navigate("/marketplace")} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <ShoppingBag className="w-4 h-4" /> الذهاب للسوق
            </Button>
          </div>
        ) : orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            tab={tab}
            onUploadReceipt={openUpload}
            onCancel={handleCancel}
          />
        ))}
      </div>

      {/* Upload Receipt Dialog */}
      <Dialog open={uploadOrderId !== null} onOpenChange={open => { if (!open) setUploadOrderId(null); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden" dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}>
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-right font-bold flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-500" /> رفع إيصال الدفع
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                يرجى رفع صورة واضحة لإيصال تحويل شام كاش. سيتم مراجعة طلبك خلال 24 ساعة.
              </p>
            </div>

            {/* Image preview */}
            {receiptPreview ? (
              <div className="relative">
                <img src={receiptPreview} alt="الإيصال" className="w-full rounded-2xl border-2 border-orange-300 max-h-64 object-contain" />
                <button onClick={() => { if (receiptPreview) URL.revokeObjectURL(receiptPreview); setReceiptPreview(null); setReceiptFile(null); }}
                  className="absolute top-2 left-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-500 flex flex-col items-center justify-center gap-3 text-orange-400 hover:text-orange-600 transition-colors"
              >
                <ImageIcon className="w-12 h-12" />
                <span className="text-sm font-semibold">اضغط لاختيار صورة الإيصال</span>
                <span className="text-xs text-muted-foreground">JPG, PNG (حتى 10 ميغابايت)</span>
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/*" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
              onChange={handleFileChange} />
          </div>

          <div className="px-5 pb-5 pt-3 shrink-0 border-t">
            <Button
              className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl gap-2"
              disabled={!receiptFile || uploading}
              onClick={submitReceipt}
            >
              {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الرفع...</> : <><Upload className="w-5 h-5" /> رفع الإيصال</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
