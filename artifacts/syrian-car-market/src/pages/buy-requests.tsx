import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth";
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
import { MapPin, Calendar, DollarSign, Plus, Trash2, User, CreditCard } from "lucide-react";

type BuyRequest = {
  id: number;
  userId: number;
  brand: string | null;
  model: string | null;
  minYear: number | null;
  maxYear: number | null;
  maxPrice: number | null;
  city: string | null;
  paymentType: string | null;
  description: string | null;
  createdAt: string;
  userName: string | null;
  userPhoto: string | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقداً",
  installment: "تقسيط",
};

export default function BuyRequests() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();

  const [requests, setRequests] = useState<BuyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    brand: "",
    model: "",
    minYear: "",
    maxYear: "",
    maxPrice: "",
    city: "",
    paymentType: "",
    description: "",
  });

  const fetchRequests = () => {
    setLoading(true);
    fetch("/api/buy-requests")
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.maxPrice) {
      toast({ title: "يرجى إدخال الحد الأقصى للسعر", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/buy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          minYear: form.minYear ? Number(form.minYear) : undefined,
          maxYear: form.maxYear ? Number(form.maxYear) : undefined,
          maxPrice: Number(form.maxPrice),
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم نشر طلبك بنجاح" });
      setOpen(false);
      setForm({ brand: "", model: "", minYear: "", maxYear: "", maxPrice: "", city: "", paymentType: "", description: "" });
      fetchRequests();
    } catch {
      toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/buy-requests/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    toast({ title: "تم حذف الطلب" });
    fetchRequests();
  };

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
              <Button className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground hover-elevate shadow-lg shadow-primary/25">
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
                  <div className="space-y-1">
                    <label className="text-sm font-medium">سنة من</label>
                    <Input type="number" name="minYear" value={form.minYear} onChange={handleChange} placeholder="2015" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">سنة إلى</label>
                    <Input type="number" name="maxYear" value={form.maxYear} onChange={handleChange} placeholder="2023" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">الحد الأقصى للسعر (ل.س) *</label>
                  <Input type="number" name="maxPrice" value={form.maxPrice} onChange={handleChange} placeholder="5000000" required />
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
                      <option value="">اختر</option>
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
                <Button type="submit" disabled={submitting} className="w-full rounded-xl font-bold">
                  {submitting ? "جارٍ النشر..." : "نشر الطلب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
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
                    حتى {Number(r.maxPrice).toLocaleString("ar-SY")} ل.س
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
                <p className="text-sm text-muted-foreground border-t pt-3 leading-relaxed">{r.description}</p>
              )}

              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {r.userPhoto ? (
                    <img src={r.userPhoto} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  {r.userName ?? "مستخدم"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                  {user && (user.id === r.userId || user.role === "admin") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r.id)}
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
    </div>
  );
}
