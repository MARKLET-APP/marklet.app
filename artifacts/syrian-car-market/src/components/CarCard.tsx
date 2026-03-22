import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Settings, Calendar, Gauge, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { ShareSheet } from "@/components/ShareSheet";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Car } from "@workspace/api-client-react";
import { ContactButtons } from "@/components/ContactButtons";

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

      <div className="p-3 space-y-2.5">
        <div>
          <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {car.brand} {car.model}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            {car.province}، {car.city}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs font-medium text-foreground bg-secondary/50 p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-primary" />
            <span>{car.mileage ? Number(car.mileage).toLocaleString("en-US") + " كم" : "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span>{car.transmission === "automatic" ? "أوتوماتيك" : "يدوي"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>مشاهدات: {views}</span>
          </div>
        </div>

        {/* Actions row — ShareSheet pill + ContactButton(s) */}
        <div className="flex items-center gap-2 pt-0.5" onClick={e => e.stopPropagation()}>
          <ShareSheet
            options={{
              title: `${car.brand} ${car.model} ${car.year}`,
              price: car.price,
              city: car.city,
              url: `${window.location.origin}/listing/${car.id}`,
              description: (car as any).description ?? null,
            }}
          />
          <ContactButtons
            phone={null}
            sellerId={(car as any).sellerId ?? null}
            listingId={car.id}
            size="sm"
            compact
            eligibleNavigateUrl={`/cars/${car.id}`}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
