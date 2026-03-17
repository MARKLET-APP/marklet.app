import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Settings, Calendar, Gauge, Eye, ChevronLeft, ChevronRight, Share2, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Car } from "@workspace/api-client-react";
import { shareListing } from "@/utils/shareListing";

function formatUSD(price: number): string {
  return "$" + price.toLocaleString("en-US");
}

export function CarCard({ car }: { car: Car }) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [views, setViews] = useState(0);
  const [tag, setTag] = useState("");
  const [imgIndex, setImgIndex] = useState(0);

  const images: string[] = (car as any).images?.length
    ? (car as any).images
    : car.primaryImage
    ? [car.primaryImage]
    : [];

  const currentImage = images[imgIndex] ?? car.primaryImage ?? null;
  const hasMultiple = images.length > 1;

  useEffect(() => {
    api.ads.recordView(car.id, user?.id ?? null).catch(() => {});
    api.ads.getViews(car.id)
      .then((data) => { setViews(data.views); setTag(data.tag); })
      .catch(() => {});
  }, [car.id]);

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex(i => (i + 1) % images.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex(i => (i - 1 + images.length) % images.length);
  };

  const goToDetail = () => navigate(`/cars/${car.id}`);

  return (
    <div
      className="group block bg-card rounded-2xl border shadow-sm hover-elevate overflow-hidden cursor-pointer"
      onClick={goToDetail}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {currentImage ? (
          <img
            src={currentImage}
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

        {/* Image slider arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={goPrev}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-10 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
              aria-label="الصورة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-10 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
              aria-label="الصورة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
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
          <p className="text-white font-bold text-xl drop-shadow-md">{formatUSD(car.price)}</p>
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
            <span>{Number(car.mileage).toLocaleString("en-US")} كم</span>
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            shareListing({
              title: `${car.brand} ${car.model} ${car.year}`,
              price: car.price,
              city: car.city,
              url: `${window.location.origin}/listing/${car.id}`,
              description: (car as any).description ?? null,
            });
          }}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-2 border border-dashed border-muted-foreground/30 rounded-xl hover:border-primary/40 hover:bg-primary/5"
        >
          <Share2 className="w-4 h-4" />
          مشاركة الإعلان
        </button>

        {/* Contact buttons — navigate to car detail to reveal phone (premium gated) */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/cars/${car.id}`)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
            title="تواصل عبر واتساب"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.556 4.123 1.529 5.856L.057 23.998 6.305 22.53C8.001 23.468 9.94 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.896 0-3.67-.512-5.192-1.407l-.372-.22-3.855.992 1.013-3.744-.243-.389C2.406 15.417 1.818 13.77 1.818 12 1.818 6.58 6.58 1.818 12 1.818c5.42 0 10.182 4.762 10.182 10.182C22.182 17.42 17.42 21.818 12 21.818z"/>
            </svg>
            واتساب
          </button>
          <button
            onClick={() => navigate(`/cars/${car.id}`)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
            title="اتصل بالبائع"
          >
            <Phone className="w-4 h-4" />
            اتصال
          </button>
        </div>
      </div>
    </div>
  );
}
