import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Star, MapPin, Phone, CalendarCheck } from "lucide-react";

type InspectionCenter = {
  id: number;
  name: string;
  city: string;
  contact: string | null;
  rating: number;
  createdAt: string;
};

const QUERY_KEY = ["inspection-centers"];

export default function InspectionsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [bookingCenter, setBookingCenter] = useState<InspectionCenter | null>(null);
  const [date, setDate] = useState("");
  const [carId, setCarId] = useState("");

  const { data: centers = [], isLoading } = useQuery<InspectionCenter[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.inspections.listCenters(),
  });

  const bookMutation = useMutation({
    mutationFn: (body: object) => api.inspections.book(body),
    onSuccess: (data) => {
      toast({ title: data.message ?? "تم حجز الموعد" });
      setBookingCenter(null);
      setDate("");
      setCarId("");
      queryClient.invalidateQueries({ queryKey: ["inspections-mine"] });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" /> مراكز فحص السيارات
        </h1>
        <p className="text-muted-foreground">احجز موعداً لفحص سيارتك في أقرب مركز متخصص</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      ) : centers.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <ShieldCheck className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <p className="text-xl font-bold text-muted-foreground">لا توجد مراكز مسجلة حالياً</p>
          <p className="text-sm text-muted-foreground">سيتم إضافة مراكز الفحص قريباً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {centers.map(c => (
            <div key={c.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-lg">{c.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{c.city}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {Number(c.rating).toFixed(1)}
                </div>
              </div>
              {c.contact && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/30">
                  <Phone className="w-4 h-4 text-primary shrink-0" />{c.contact}
                </p>
              )}
              {user ? (
                <Dialog open={bookingCenter?.id === c.id} onOpenChange={open => setBookingCenter(open ? c : null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full rounded-xl gap-2 font-bold">
                      <CalendarCheck className="w-4 h-4" /> احجز موعد فحص
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm" dir="rtl">
                    <DialogHeader><DialogTitle>حجز فحص — {c.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">تاريخ الفحص</label>
                        <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">رقم إعلان السيارة (اختياري)</label>
                        <Input type="number" value={carId} onChange={e => setCarId(e.target.value)} placeholder="مثال: 42" />
                      </div>
                      <Button
                        className="w-full rounded-xl font-bold"
                        disabled={!date || bookMutation.isPending}
                        onClick={() => bookMutation.mutate({ centerId: c.id, date, carId: carId || undefined })}
                      >
                        {bookMutation.isPending ? "جارٍ الحجز..." : "تأكيد الحجز"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <p className="text-xs text-center text-muted-foreground">سجّل الدخول للحجز</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
