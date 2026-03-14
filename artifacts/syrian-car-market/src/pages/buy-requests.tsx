import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, DollarSign, Plus, Trash2, User, CreditCard, MessageCircle, Eye, Loader2, Car } from "lucide-react";

type BuyRequest = {
  id: number;
  userId: number;
  brand: string | null;
  model: string | null;
  minYear: number | null;
  maxYear: number | null;
  maxPrice: number | null;
  currency: string | null;
  city: string | null;
  paymentType: string | null;
  description: string | null;
  status: string | null;
  createdAt: string;
  userName: string | null;
  userPhoto: string | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقداً",
  installment: "تقسيط",
};

const QUERY_KEY = ["buy-requests"];

export default function BuyRequests() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const isSellerOrDealer = user?.role === "seller" || user?.role === "dealer" || user?.role === "admin";

  const [open, setOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<BuyRequest | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [form, setForm] = useState({
    brand: "", model: "", minYear: "", maxYear: "",
    maxPrice: "", city: "", paymentType: "", description: "",
  });

  const { data: requests = [], isLoading } = useQuery<BuyRequest[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.buyRequests.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.buyRequests.create(body),
    onSuccess: (data) => {
      toast({ title: (data as any).message ?? "تم نشر طلبك بنجاح، سيُراجَع من قِبَل الإدارة" });
      setOpen(false);
      setForm({ brand: "", model: "", minYear: "", maxYear: "", maxPrice: "", city: "", paymentType: "", description: "" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.buyRequests.delete(id),
    onSuccess: () => {
      toast({ title: "تم حذف الطلب" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      minYear: form.minYear ? Number(form.minYear) : undefined,
      maxYear: form.maxYear ? Number(form.maxYear) : undefined,
      maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
    });
  };

  const startChatWithOwner = async (targetUserId: number) => {
    if (!user) { navigate("/login"); return; }
    if (user.id === targetUserId) {
      toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" });
      return;
    }
    setStartingChat(true);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = localStorage.getItem("scm_token");
      const res = await fetch(`${BASE}/api/chats/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: targetUserId, carId: null }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        if (data.error?.includes("yourself")) {
          toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" });
        } else {
          throw new Error(data.error ?? "فشل بدء المحادثة");
        }
        return;
      }
      navigate(`/messages?conversationId=${data.id}`);
    } catch (err: any) {
      toast({ title: err.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  const CAR_BRANDS: Record<string, string> = {
    toyota: "toyota", hyundai: "hyundai", kia: "kia", bmw: "bmw", mercedes: "mercedes",
    audi: "audi", nissan: "nissan", honda: "honda", mazda: "mazda", mitsubishi: "mitsubishi",
  };
  function getCarImage(brand: string | null) {
    const b = (brand ?? "").toLowerCase().trim();
    const knownBrand = CAR_BRANDS[b];
    if (knownBrand) return `https://img.icons8.com/color/96/${knownBrand}.png`;
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">طلبات الشراء</h1>
          <p className="text-muted-foreground mt-1">يبحث هؤلاء المشترون عن سيارة — هل تملك ما يريدون؟</p>
        </div>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4" /> نشر طلب
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">طلب شراء سيارة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">الماركة</label>
                    <Input name="brand" value={form.brand} onChange={handleChange} placeholder="مثال: Toyota" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">الموديل</label>
                    <Input name="model" value={form.model} onChange={handleChange} placeholder="مثال: كامري" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">سنة من</label>
                    <Input type="number" name="minYear" value={form.minYear} onChange={handleChange} placeholder="2010" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">سنة إلى</label>
                    <Input type="number" name="maxYear" value={form.maxYear} onChange={handleChange} placeholder="2023" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">الحد الأقصى للسعر (USD) *</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">$</span>
                    <Input type="number" name="maxPrice" value={form.maxPrice} onChange={handleChange} placeholder="5000" required className="pr-8" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">المدينة</label>
                    <Input name="city" value={form.city} onChange={handleChange} placeholder="دمشق" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">طريقة الدفع</label>
                    <select
                      name="paymentType"
                      value={form.paymentType}
                      onChange={handleChange}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    >
                      <option value="">غير محدد</option>
                      <option value="cash">نقداً</option>
                      <option value="installment">تقسيط</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">تفاصيل إضافية</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="أي مواصفات إضافية تريدها في السيارة..."
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  />
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl font-bold">
                  {createMutation.isPending ? "جارٍ النشر..." : "نشر الطلب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-xl font-bold mb-2">لا توجد طلبات حتى الآن</p>
          <p className="text-sm">كن أول من ينشر طلب شراء</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {requests.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {r.brand || "أي ماركة"} {r.model || ""}
                  </h3>
                  {(r.minYear || r.maxYear) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {r.minYear ?? "—"} – {r.maxYear ?? "—"}
                    </p>
                  )}
                </div>
                {r.paymentType && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CreditCard className="w-3 h-3" />
                    {PAYMENT_LABELS[r.paymentType] ?? r.paymentType}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {r.maxPrice && (
                  <span className="flex items-center gap-1 text-primary font-bold">
                    <DollarSign className="w-4 h-4" />
                    حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}
                  </span>
                )}
                {r.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {r.city}
                  </span>
                )}
              </div>

              {r.description && (
                <p className="text-sm text-muted-foreground border-t pt-3 leading-relaxed line-clamp-2">{r.description}</p>
              )}

              {/* Action buttons — visible to any logged-in user who doesn't own the request */}
              {user && user.id !== r.userId && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl gap-1.5 bg-primary hover:bg-primary/90 font-bold text-xs"
                    onClick={() => startChatWithOwner(r.userId)}
                    disabled={startingChat}
                  >
                    {startingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    مراسلة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl gap-1.5 text-xs"
                    onClick={() => setDetailRequest(r)}
                  >
                    <Eye className="w-3.5 h-3.5" /> التفاصيل
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {r.userPhoto ? (
                    <img src={r.userPhoto} className="w-6 h-6 rounded-full object-cover" alt="" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  {r.userName ?? "مستخدم"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                  {r.status && r.status !== "approved" && (
                    <Badge variant={r.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                      {r.status === "pending" ? "بانتظار الموافقة" : "مرفوض"}
                    </Badge>
                  )}
                  {user && (user.id === r.userId || user.role === "admin") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Buy Request Detail Dialog ── */}
      <Dialog open={!!detailRequest} onOpenChange={(o) => { if (!o) setDetailRequest(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              تفاصيل طلب الشراء
            </DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-4 mt-2">
              {/* Car image suggestion */}
              <div className="flex justify-center">
                {getCarImage(detailRequest.brand) ? (
                  <img src={getCarImage(detailRequest.brand)!} alt={detailRequest.brand ?? ""} className="w-32 h-32 object-contain" />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center">
                    <Car className="w-16 h-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Brand / Model / Year */}
              <div className="bg-muted/30 rounded-2xl p-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">الماركة</p>
                  <p className="font-bold">{detailRequest.brand || "غير محدد"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الموديل</p>
                  <p className="font-bold">{detailRequest.model || "غير محدد"}</p>
                </div>
                {(detailRequest.minYear || detailRequest.maxYear) && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">سنة الصنع</p>
                    <p className="font-bold flex items-center gap-1"><Calendar className="w-4 h-4 text-primary" />{detailRequest.minYear ?? "—"} – {detailRequest.maxYear ?? "—"}</p>
                  </div>
                )}
              </div>

              {/* Price */}
              {detailRequest.maxPrice && (
                <div className="bg-primary/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">الحد الأقصى للسعر</p>
                  <p className="text-2xl font-extrabold text-primary">
                    {Number(detailRequest.maxPrice).toLocaleString()} {detailRequest.currency ?? "USD"}
                  </p>
                </div>
              )}

              {/* City */}
              {detailRequest.city && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{detailRequest.city}</span>
                </div>
              )}

              {/* Description */}
              {detailRequest.description && (
                <div className="bg-muted/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">تفاصيل إضافية</p>
                  <p className="text-sm leading-relaxed">{detailRequest.description}</p>
                </div>
              )}

              {/* Requestor info */}
              <div className="flex items-center gap-3 border rounded-xl p-3 bg-background">
                {detailRequest.userPhoto ? (
                  <img src={detailRequest.userPhoto} className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm">{detailRequest.userName ?? "مستخدم"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(detailRequest.createdAt).toLocaleDateString("ar-EG")}</p>
                </div>
              </div>

              {/* Message button */}
              {user && user.id !== detailRequest.userId && (
                <Button
                  className="w-full rounded-xl gap-2 font-bold bg-primary hover:bg-primary/90"
                  onClick={() => { setDetailRequest(null); startChatWithOwner(detailRequest.userId); }}
                  disabled={startingChat}
                >
                  {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  مراسلة صاحب الطلب
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
