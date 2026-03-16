import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Star, MapPin, Phone, CalendarCheck, Search, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type InspectionCenter = {
  id: number;
  name: string;
  city: string;
  province: string | null;
  address: string | null;
  phone: string | null;
  contact: string | null;
  rating: number;
  isFeatured: boolean;
  createdAt: string;
};

const QUERY_KEY = ["inspection-centers"];

export default function InspectionsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [bookingCenter, setBookingCenter] = useState<InspectionCenter | null>(null);
  const [date, setDate] = useState("");
  const [carId, setCarId] = useState("");

  const { data: centers = [], isLoading } = useQuery<InspectionCenter[]>({
    queryKey: [...QUERY_KEY, searchQ],
    queryFn: () => api.get(`${BASE}/api/inspection-centers${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ""}`).then(r => r.json()),
  });

  const featured = centers.filter(c => c.isFeatured);
  const regular = centers.filter(c => !c.isFeatured);

  const bookMutation = useMutation({
    mutationFn: (body: object) => api.inspections.book(body),
    onSuccess: (data: any) => {
      toast({ title: data.message ?? "تم حجز الموعد بنجاح" });
      setBookingCenter(null);
      setDate("");
      setCarId("");
      qc.invalidateQueries({ queryKey: ["inspections-mine"] });
    },
    onError: () => toast({ title: "حدث خطأ أثناء الحجز", variant: "destructive" }),
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (!bookingCenter || !date) return;
    bookMutation.mutate({ centerId: bookingCenter.id, date, carId: carId || undefined });
  };

  const handleContact = (center: InspectionCenter) => {
    const phone = center.phone || center.contact;
    if (phone) {
      window.open(`tel:${phone.replace(/[^0-9+]/g, "")}`, "_self");
    } else {
      toast({ title: "لا يوجد رقم هاتف لهذا المركز", variant: "destructive" });
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={cn("w-3.5 h-3.5", i <= full ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
        ))}
        <span className="text-xs text-muted-foreground mr-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const CenterCard = ({ center }: { center: InspectionCenter }) => (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow",
      center.isFeatured && "border-amber-300 ring-1 ring-amber-200"
    )}>
      {/* Card Header */}
      <div className={cn(
        "px-4 py-3 flex items-start justify-between gap-2",
        center.isFeatured ? "bg-amber-50 border-b border-amber-100" : "bg-muted/30 border-b"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            center.isFeatured ? "bg-amber-100" : "bg-teal-100"
          )}>
            <ShieldCheck className={cn("w-5 h-5", center.isFeatured ? "text-amber-600" : "text-teal-600")} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground leading-tight">{center.name}</h3>
            {center.isFeatured && (
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> مركز مميز
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        {renderStars(center.rating)}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{[center.address, center.city, center.province].filter(Boolean).join("، ")}</span>
        </div>
        {(center.phone || center.contact) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span dir="ltr">{center.phone || center.contact}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 flex gap-2">
        <Button
          size="sm"
          className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-bold"
          onClick={() => { if (!user) { navigate("/login"); return; } setBookingCenter(center); }}
        >
          <CalendarCheck className="w-3.5 h-3.5" /> حجز موعد
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 rounded-xl border-teal-300 text-teal-700 gap-1.5 text-xs font-bold"
          onClick={() => handleContact(center)}
        >
          <Phone className="w-3.5 h-3.5" /> تواصل
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-teal-600 to-teal-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/inspection.svg')" }} />
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">مراكز فحص السيارات</h1>
          </div>
          <p className="text-teal-100 text-sm mb-4">ابحث عن أقرب مركز فحص موثوق في سوريا</p>

          {/* Search Bar */}
          <form
            onSubmit={e => { e.preventDefault(); setSearchQ(search); }}
            className="flex gap-2"
          >
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث باسم المركز، المدينة، المحافظة..."
                className="bg-white/10 border-white/20 text-white placeholder:text-teal-200 pr-9 rounded-xl focus:bg-white/20"
              />
            </div>
            <Button type="submit" className="rounded-xl bg-white text-teal-700 hover:bg-teal-50 font-bold border-0 shrink-0">
              بحث
            </Button>
            {searchQ && (
              <Button type="button" variant="ghost" onClick={() => { setSearchQ(""); setSearch(""); }} className="rounded-xl text-white hover:bg-white/10 shrink-0">
                مسح
              </Button>
            )}
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 pb-8 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          </div>
        ) : centers.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-bold mb-2">لا توجد مراكز فحص حالياً</p>
            {searchQ && <p className="text-sm">لا توجد نتائج لـ "{searchQ}"</p>}
          </div>
        ) : (
          <>
            {/* Featured Centers */}
            {featured.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <h2 className="text-lg font-bold text-foreground">المراكز المميزة</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map(c => <CenterCard key={c.id} center={c} />)}
                </div>
              </section>
            )}

            {/* All Centers */}
            {regular.length > 0 && (
              <section>
                {featured.length > 0 && (
                  <h2 className="text-lg font-bold text-foreground mb-4">جميع المراكز</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regular.map(c => <CenterCard key={c.id} center={c} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={!!bookingCenter} onOpenChange={o => { if (!o) setBookingCenter(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-teal-600" />
              حجز موعد فحص
            </DialogTitle>
          </DialogHeader>
          {bookingCenter && (
            <form onSubmit={handleBook} className="space-y-4 mt-2">
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                <p className="font-bold text-teal-800">{bookingCenter.name}</p>
                <p className="text-sm text-teal-600">{bookingCenter.city}</p>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">تاريخ الموعد *</label>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">رقم السيارة (اختياري)</label>
                <Input
                  value={carId}
                  onChange={e => setCarId(e.target.value)}
                  placeholder="رقم لوحة السيارة أو رقم الإعلان"
                  className="rounded-xl"
                />
              </div>
              <Button
                type="submit"
                disabled={bookMutation.isPending || !date}
                className="w-full rounded-xl font-bold bg-teal-600 hover:bg-teal-700"
              >
                {bookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأكيد الحجز
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
