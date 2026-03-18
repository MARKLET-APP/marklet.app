import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Settings, Calendar, Gauge, Eye, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Car } from "@workspace/api-client-react";
import { shareListing } from "@/utils/shareListing";
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
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
      onClick={goToDetail}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
        {currentImage ? (
          <img
            src={currentImage}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80"
            alt="Placeholder"
            className="w-full h-full object-cover opacity-40 grayscale"
          />
        )}

        {/* Slider arrows */}
        {hasMultiple && (
          <>
            <button onClick={goPrev}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center z-10 backdrop-blur-sm"
              aria-label="السابق">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={goNext}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center z-10 backdrop-blur-sm"
              aria-label="التالي">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}

        {/* Badges top-right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {tag && (
            <Badge className="bg-orange-500 text-white border-none text-[10px] font-bold px-2 py-0.5 shadow-sm">
              {tag === "Hot" ? "🔥 رائج" : "⭐ شائع"}
            </Badge>
          )}
          {car.isFeatured && (
            <Badge className="bg-amber-500 text-white border-none text-[10px] font-bold px-2 py-0.5 shadow-sm">
              مميز
            </Badge>
          )}
          {car.saleType === "installment" && (
            <Badge className="bg-primary text-white border-none text-[10px] font-bold px-2 py-0.5 shadow-sm">
              أقساط
            </Badge>
          )}
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-3 pt-8">
          <p className="text-white font-extrabold text-base drop-shadow">{formatUSD(car.price)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2.5">
        {/* Title + Location */}
        <div>
          <h3 className="font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-primary transition-colors">
            {car.brand} {car.model}
          </h3>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {car.province}، {car.city}
          </p>
        </div>

        {/* Specs row */}
        <div className="flex items-center gap-2.5 text-[11px] text-gray-500 font-medium bg-gray-50 rounded-xl px-2.5 py-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary" />{car.year}
          </span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-primary" />
            {car.mileage ? Number(car.mileage).toLocaleString("en-US") + " km" : "—"}
          </span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">
            <Settings className="w-3 h-3 text-primary" />
            {car.transmission === "automatic" ? "أوتو" : "يدوي"}
          </span>
          <span className="ms-auto flex items-center gap-0.5 text-gray-400">
            <Eye className="w-3 h-3" />{views}
          </span>
        </div>

        {/* Share */}
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
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-primary transition-colors py-1.5 border border-dashed border-gray-200 rounded-xl hover:border-primary/40 hover:bg-primary/5"
        >
          <Share2 className="w-3 h-3" />
          مشاركة
        </button>

        {/* Contact */}
        <div onClick={e => e.stopPropagation()}>
          <ContactButtons
            phone={null}
            sellerId={(car as any).sellerId ?? null}
            listingId={car.id}
            size="sm"
            eligibleNavigateUrl={`/cars/${car.id}`}
          />
        </div>
      </div>
    </div>
  );
}
