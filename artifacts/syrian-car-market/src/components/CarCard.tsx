import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MapPin, Settings, Calendar, Gauge, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Car } from "@workspace/api-client-react";

export function CarCard({ car }: { car: Car }) {
  const { user } = useAuthStore();
  const [views, setViews] = useState(0);
  const [tag, setTag] = useState("");

  useEffect(() => {
    // تسجيل المشاهدة عند تحميل الإعلان
    api.ads.recordView(car.id, user?.id ?? null).catch(() => {});

    // جلب عدد المشاهدات والوسم
    api.ads.getViews(car.id)
      .then((data) => { setViews(data.views); setTag(data.tag); })
      .catch(() => {});
  }, [car.id]);

  const formattedPrice = new Intl.NumberFormat("ar-SY", {
    style: "currency",
    currency: "SYP",
    maximumFractionDigits: 0,
  }).format(car.price);

  return (
    <Link href={`/cars/${car.id}`} className="group block bg-card rounded-2xl border shadow-sm hover-elevate overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {car.primaryImage ? (
          <img
            src={car.primaryImage}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <img
              src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80"
              alt="Placeholder"
              className="w-full h-full object-cover opacity-50 grayscale"
            />
          </div>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {tag && (
            <Badge className="bg-orange-500 text-white border-none font-bold px-3 py-1 shadow-md">
              {tag === "Hot" ? "🔥 رائج" : "⭐ شائع"}
            </Badge>
          )}
          {car.isFeatured && (
            <Badge className="bg-accent text-accent-foreground border-none font-bold px-3 py-1 shadow-md shadow-accent/20">
              مميز
            </Badge>
          )}
          {car.saleType === "installment" && (
            <Badge className="bg-primary text-primary-foreground border-none font-bold px-3 py-1 shadow-md shadow-primary/20">
              أقساط
            </Badge>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
          <p className="text-white font-bold text-xl drop-shadow-md">{formattedPrice}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {car.brand} {car.model}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {car.province}، {car.city}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium text-foreground bg-secondary/50 p-3 rounded-xl">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-primary" />
            <span>{car.mileage.toLocaleString("ar-EG")} كم</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-primary" />
            <span>{car.transmission === "automatic" ? "أوتوماتيك" : "يدوي"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-primary" />
            <span>مشاهدات اليوم: {views}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
