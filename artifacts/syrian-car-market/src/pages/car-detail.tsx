import { useRoute } from "wouter";
import { useGetCar } from "@workspace/api-client-react";
import { MapPin, Settings, Calendar, Gauge, Fuel, Phone, Heart, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";

export default function CarDetail() {
  const [, params] = useRoute("/cars/:id");
  const carId = Number(params?.id);
  const { data: car, isLoading, isError } = useGetCar(carId);
  const { user } = useAuthStore();

  if (isLoading) return <div className="flex justify-center py-32"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (isError || !car) return <div className="text-center py-32 font-bold text-xl text-destructive">عذراً، لم نتمكن من العثور على هذه السيارة.</div>;

  const formattedPrice = new Intl.NumberFormat('ar-SY', { style: 'currency', currency: 'SYP', maximumFractionDigits: 0 }).format(car.price);

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Left Column: Images & Main Info */}
      <div className="flex-1 space-y-6">
        {/* Image Gallery */}
        <div className="bg-card rounded-3xl overflow-hidden border shadow-sm">
          <div className="aspect-[16/9] bg-muted relative">
            <img src={car.images?.[0]?.imageUrl || car.primaryImage || "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80"} alt={car.brand} className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 flex gap-2">
              {car.isFeatured && <Badge className="bg-accent text-accent-foreground text-sm font-bold shadow-lg">إعلان مميز</Badge>}
            </div>
            <div className="absolute top-4 left-4 flex gap-2">
              <Button size="icon" variant="secondary" className="rounded-full shadow-lg hover-elevate bg-white/80 backdrop-blur-sm text-foreground hover:text-red-500">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full shadow-lg hover-elevate bg-white/80 backdrop-blur-sm text-foreground">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {car.images?.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto">
              {car.images.map((img) => (
                <img key={img.id} src={img.imageUrl} alt="" className="w-24 h-24 object-cover rounded-xl cursor-pointer hover:ring-2 ring-primary transition-all" />
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="bg-card p-6 md:p-8 rounded-3xl border shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
                {car.brand} {car.model} {car.year}
              </h1>
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {car.province}، {car.city}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl md:text-4xl font-black text-primary mb-1">{formattedPrice}</p>
              <Badge variant="outline" className="text-sm font-medium border-primary/20 text-primary bg-primary/5">
                دفع {car.saleType === 'cash' ? 'نقدي' : 'بالتقسيط'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SpecItem icon={<Calendar />} label="سنة الصنع" value={car.year.toString()} />
            <SpecItem icon={<Gauge />} label="المسافة" value={`${car.mileage.toLocaleString('ar-EG')} كم`} />
            <SpecItem icon={<Settings />} label="ناقل الحركة" value={car.transmission === 'automatic' ? 'أوتوماتيك' : 'يدوي'} />
            <SpecItem icon={<Fuel />} label="نوع الوقود" value={car.fuelType === 'petrol' ? 'بنزين' : car.fuelType} />
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-foreground">الوصف</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {car.description || 'لا يوجد وصف مضاف لهذا الإعلان.'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Seller Info */}
      <div className="w-full lg:w-80 shrink-0 space-y-6">
        <div className="bg-card p-6 rounded-3xl border shadow-sm sticky top-24">
          <h3 className="font-bold text-lg mb-6 border-b pb-4">معلومات البائع</h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-muted rounded-full overflow-hidden shrink-0 border-2 border-primary/20">
              <img src={car.sellerPhoto || `https://ui-avatars.com/api/?name=${car.sellerName}&background=random`} alt={car.sellerName} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-lg">{car.sellerName}</p>
              {car.sellerRating ? (
                <div className="flex items-center gap-1 text-accent mt-1 text-sm font-medium">
                  {'★'.repeat(Math.round(car.sellerRating))}
                  <span className="text-muted-foreground ms-1">({car.sellerRating})</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">بائع جديد</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Button className="w-full rounded-xl h-12 text-base font-bold gap-2 hover-elevate bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Phone className="w-5 h-5" /> عرض رقم الهاتف
            </Button>
            
            {user ? (
              <Button variant="outline" className="w-full rounded-xl h-12 text-base font-bold gap-2 border-2 hover:bg-secondary/50">
                <ShieldCheck className="w-5 h-5 text-primary" /> بدء محادثة آمنة
              </Button>
            ) : (
              <p className="text-xs text-center text-muted-foreground">قم بتسجيل الدخول لبدء المحادثة</p>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t text-sm text-muted-foreground text-center">
            رقم الإعلان: #{car.id} <br/>
            تاريخ النشر: {new Date(car.createdAt).toLocaleDateString('ar-EG')}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-secondary/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
      <div className="text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  );
}
