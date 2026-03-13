import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, Car } from "lucide-react";

type JunkCar = {
  id: number;
  sellerId: number;
  type: string | null;
  model: string | null;
  year: number | null;
  condition: string | null;
  price: number | null;
  city: string | null;
  images: string[] | null;
  description: string | null;
  createdAt: string;
  sellerName: string | null;
};

const CONDITIONS = ["حادث", "عطل", "خردة كاملة"];
const QUERY_KEY = ["junk-cars"];

export default function JunkCarsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "", model: "", year: "", condition: "حادث", price: "", city: "", description: "" });

  const { data: cars = [], isLoading } = useQuery<JunkCar[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.junkCars.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.junkCars.create(body),
    onSuccess: (data) => {
      toast({ title: data.message ?? "تم نشر الإعلان" });
      setOpen(false);
      setForm({ type: "", model: "", year: "", condition: "حادث", price: "", city: "", description: "" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.junkCars.delete(id),
    onSuccess: () => { toast({ title: "تم الحذف" }); queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, year: form.year ? Number(form.year) : undefined, price: form.price ? Number(form.price) : undefined });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Car className="w-8 h-8 text-primary" /> سيارات الخردة والمعطوبة</h1>
          <p className="text-muted-foreground mt-1">سيارات حوادث وخردة للبيع أو الاستخدام في قطع الغيار</p>
        </div>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground hover-elevate shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4" /> إضافة إعلان
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader><DialogTitle className="text-xl font-bold">بيع سيارة معطوبة / خردة</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <Input name="type" value={form.type} onChange={handleChange} placeholder="نوع السيارة" />
                  <Input name="model" value={form.model} onChange={handleChange} placeholder="الموديل" />
                  <Input type="number" name="year" value={form.year} onChange={handleChange} placeholder="السنة" />
                  <select name="condition" value={form.condition} onChange={handleChange} className="border rounded-md px-3 py-2 text-sm bg-background">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Input type="number" name="price" value={form.price} onChange={handleChange} placeholder="السعر (ل.س) — اختياري" />
                <Input name="city" value={form.city} onChange={handleChange} placeholder="المدينة" />
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="وصف الحالة..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
                <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl font-bold">
                  {createMutation.isPending ? "جارٍ النشر..." : "نشر الإعلان"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      ) : cars.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد إعلانات حالياً</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cars.map(c => (
            <div key={c.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {c.images?.[0] ? (
                <img src={c.images[0]} alt={c.model ?? "خردة"} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center"><Car className="w-12 h-12 text-muted-foreground/30" /></div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-foreground">{[c.type, c.model, c.year].filter(Boolean).join(" ") || "سيارة معطوبة"}</h3>
                  {c.condition && (
                    <Badge className={c.condition === "خردة كاملة" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}>
                      {c.condition}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  {c.price ? <span className="font-bold text-primary">{Number(c.price).toLocaleString("ar-SY")} ل.س</span> : <span className="text-muted-foreground text-sm">السعر قابل للتفاوض</span>}
                  {c.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                {user && user.id === c.sellerId && (
                  <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 mt-1" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="w-4 h-4 me-1" /> حذف
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
