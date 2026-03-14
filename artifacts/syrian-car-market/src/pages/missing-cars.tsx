import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2, AlertTriangle, CheckCircle, ImagePlus, X, Loader2 } from "lucide-react";

type MissingCar = {
  id: number;
  reporterId: number | null;
  image: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  plateNumber: string | null;
  city: string | null;
  description: string | null;
  isFound: string | null;
  createdAt: string;
  reporterName: string | null;
};

const QUERY_KEY = ["missing-cars"];

export default function MissingCarsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", color: "", plateNumber: "", city: "", description: "" });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: cars = [], isLoading } = useQuery<MissingCar[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.missingCars.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.missingCars.create(body),
    onSuccess: (data) => {
      toast({ title: data.message ?? "تم نشر البلاغ" });
      setOpen(false);
      setForm({ brand: "", model: "", color: "", plateNumber: "", city: "", description: "" });
      setUploadedImages([]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const foundMutation = useMutation({
    mutationFn: (id: number) => api.missingCars.markFound(id),
    onSuccess: () => { toast({ title: "تم تحديث الحالة: تم العثور على السيارة" }); queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.missingCars.delete(id),
    onSuccess: () => { toast({ title: "تم الحذف" }); queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = localStorage.getItem("scm_token");
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch(`${BASE}/api/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const data = await res.json() as any;
        if (data.url) uploaded.push(data.url);
      }
      setUploadedImages(prev => [...prev, ...uploaded]);
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx: number) =>
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, reporterId: user?.id, image: uploadedImages[0] ?? null });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><AlertTriangle className="w-8 h-8 text-amber-500" /> السيارات المفقودة</h1>
          <p className="text-muted-foreground mt-1">أبلغ عن سيارة مفقودة أو مسروقة — معاً نساعد بعضنا</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setUploadedImages([]); setForm({ brand: "", model: "", color: "", plateNumber: "", city: "", description: "" }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white hover-elevate shadow-lg">
              <Plus className="w-4 h-4" /> نشر بلاغ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader><DialogTitle className="text-xl font-bold">الإبلاغ عن سيارة مفقودة</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <Input name="brand" value={form.brand} onChange={handleChange} placeholder="الماركة" />
                <Input name="model" value={form.model} onChange={handleChange} placeholder="الموديل" />
                <Input name="color" value={form.color} onChange={handleChange} placeholder="اللون" />
                <Input name="plateNumber" value={form.plateNumber} onChange={handleChange} placeholder="رقم اللوحة" />
              </div>
              <Input name="city" value={form.city} onChange={handleChange} placeholder="المدينة أو المنطقة" />
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="أي تفاصيل إضافية تساعد في التعرف على السيارة..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />

              {/* Image upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium">صور السيارة (اختياري)</p>
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedImages.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 left-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full gap-2 rounded-xl border-dashed border-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {uploading ? "جارٍ الرفع..." : "إرفاق صور السيارة"}
                </Button>
              </div>

              <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white">
                {createMutation.isPending ? "جارٍ النشر..." : "نشر البلاغ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" /></div>
      ) : cars.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground"><p className="text-xl font-bold mb-2">لا توجد بلاغات حالياً</p><p className="text-sm">الحمد لله</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cars.map(c => (
            <div key={c.id} className={`bg-card border-2 rounded-2xl overflow-hidden shadow-sm transition-shadow ${c.isFound === "yes" ? "border-green-200 opacity-70" : "border-amber-200 hover:shadow-md"}`}>
              {c.image ? (
                <img src={c.image} alt={c.brand ?? "سيارة"} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-16 h-16 text-amber-300" /></div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-foreground">{[c.brand, c.model].filter(Boolean).join(" ") || "سيارة غير محددة"}</h3>
                  <Badge className={c.isFound === "yes" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {c.isFound === "yes" ? "تم العثور عليها" : "مفقودة"}
                  </Badge>
                </div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  {c.color && <p>اللون: <span className="font-medium text-foreground">{c.color}</span></p>}
                  {c.plateNumber && <p>اللوحة: <span className="font-bold text-foreground">{c.plateNumber}</span></p>}
                  {c.city && <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.city}</p>}
                </div>
                {c.description && <p className="text-sm text-muted-foreground border-t pt-2 line-clamp-2">{c.description}</p>}
                <div className="flex gap-2 pt-1">
                  {c.isFound !== "yes" && user && (
                    <Button size="sm" variant="outline" className="flex-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => foundMutation.mutate(c.id)}>
                      <CheckCircle className="w-4 h-4 me-1" /> تم العثور عليها
                    </Button>
                  )}
                  {user && (user.id === c.reporterId || user.role === "admin") && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ar-EG")} — {c.reporterName ?? "مجهول"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
