import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MapPin, Trash2, Wrench } from "lucide-react";

type CarPart = {
  id: number;
  sellerId: number;
  name: string;
  carType: string | null;
  model: string | null;
  year: number | null;
  condition: string | null;
  price: number;
  city: string | null;
  images: string[] | null;
  description: string | null;
  createdAt: string;
  sellerName: string | null;
};

const QUERY_KEY = (q: string) => ["car-parts", q];

export default function CarPartsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", carType: "", model: "", year: "", condition: "مستعملة", price: "", city: "", description: "" });

  const { data: parts = [], isLoading } = useQuery<CarPart[]>({
    queryKey: QUERY_KEY(q),
    queryFn: () => api.carParts.list(q),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.carParts.create(body),
    onSuccess: () => {
      toast({ title: "تم نشر القطعة بنجاح" });
      setOpen(false);
      setForm({ name: "", carType: "", model: "", year: "", condition: "مستعملة", price: "", city: "", description: "" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(q) });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.carParts.delete(id),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(q) });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, year: form.year ? Number(form.year) : undefined, price: Number(form.price) });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Wrench className="w-8 h-8 text-primary" /> سوق قطع السيارات</h1>
          <p className="text-muted-foreground mt-1">ابحث عن قطع غيار أصلية وتستعمل بأسعار مناسبة</p>
        </div>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground hover-elevate shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4" /> إضافة قطعة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader><DialogTitle className="text-xl font-bold">نشر قطعة سيارة</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                <Input name="name" value={form.name} onChange={handleChange} placeholder="اسم القطعة *" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="carType" value={form.carType} onChange={handleChange} placeholder="نوع السيارة" />
                  <Input name="model" value={form.model} onChange={handleChange} placeholder="الموديل" />
                  <Input type="number" name="year" value={form.year} onChange={handleChange} placeholder="السنة" />
                  <select name="condition" value={form.condition} onChange={handleChange} className="border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="جديدة">جديدة</option>
                    <option value="مستعملة">مستعملة</option>
                  </select>
                </div>
                <Input type="number" name="price" value={form.price} onChange={handleChange} placeholder="السعر (ل.س) *" required />
                <Input name="city" value={form.city} onChange={handleChange} placeholder="المدينة" />
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="وصف إضافي" className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
                <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl font-bold">
                  {createMutation.isPending ? "جارٍ النشر..." : "نشر القطعة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); setQ(search); }} className="flex gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم القطعة، النوع، الموديل..." className="rounded-xl" />
        <Button type="submit" size="icon" className="rounded-xl shrink-0"><Search className="w-4 h-4" /></Button>
        {q && <Button type="button" variant="ghost" onClick={() => { setQ(""); setSearch(""); }} className="rounded-xl">مسح</Button>}
      </form>

      {isLoading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      ) : parts.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد قطع حالياً</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {parts.map(p => (
            <div key={p.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center"><Wrench className="w-12 h-12 text-muted-foreground/30" /></div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-foreground">{p.name}</h3>
                  {p.condition && <Badge variant="secondary" className="text-xs">{p.condition}</Badge>}
                </div>
                {(p.carType || p.model) && <p className="text-sm text-muted-foreground">{[p.carType, p.model, p.year].filter(Boolean).join(" • ")}</p>}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-primary">{Number(p.price).toLocaleString("ar-SY")} ل.س</span>
                  {p.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
                </div>
                {user && user.id === p.sellerId && (
                  <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 mt-1" onClick={() => deleteMutation.mutate(p.id)}>
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
