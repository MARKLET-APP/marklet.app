// UI_ID: COMP_CARD_CAR_01
// NAME: بطاقة السيارة
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { MapPin, Settings, Calendar, Gauge, Eye, ChevronLeft, ChevronRight, MessageCircle, Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { withApi } from "@/lib/runtimeConfig";
import type { Car } from "@workspace/api-client-react";

function formatUSD(price: number): string {
  return "$" + price.toLocaleString("en-US");
}

export function CarCard({ car }: { car: Car }) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [views, setViews] = useState(0);
  const [tag, setTag] = useState("");
  const [imgIndex, setImgIndex] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);

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

  const handleChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    const sellerId = (car as any).sellerId;
    if (!sellerId) { navigate(`/cars/${car.id}`); return; }
    try {
      setChatLoading(true);
      const token = localStorage.getItem("scm_token");
      const res = await fetch(withApi("/api/chats/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sellerId, carId: car.id }),
      });
      if (res.ok) {
        const conv = await res.json().catch(() => null);
        const initialMsg = `مرحباً، أنا مهتم بـ ${[car.brand, car.model, car.year].filter(Boolean).join(" ")}. هل ما زالت متوفرة؟`;
        navigate(conv?.id ? `/messages?conversationId=${conv.id}&initial=${encodeURIComponent(initialMsg)}` : "/messages");
      }
    } catch {
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div
      className="group flex flex-col h-full bg-card rounded-2xl border shadow-sm hover-elevate overflow-hidden cursor-pointer"
      onClick={goToDetail}
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden shrink-0">
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

      {/* ── Content ── */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {car.brand} {car.model}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{car.province}، {car.city}</span>
          </p>
          {/* ── Showroom badge ── */}
          {(car as any).showroomId && (car as any).showroomName && (
            <Link
              href={`/showroom/${(car as any).showroomId}`}
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-full transition-colors w-fit"
            >
              <Building2 className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[120px]">{(car as any).showroomName}</span>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs font-medium text-foreground bg-secondary/50 p-2 rounded-xl">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary shrink-0" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{car.mileage ? Number(car.mileage).toLocaleString("en-US") + " كم" : "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings className="w-3 h-3 text-primary shrink-0" />
            <span>{car.transmission === "automatic" ? "أوتوماتيك" : "يدوي"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-primary shrink-0" />
            <span>مشاهدات: {views}</span>
          </div>
        </div>

        {/* ─── action buttons: always at bottom ─── */}
        <div className="flex gap-1.5 pt-2 border-t mt-auto" onClick={e => e.stopPropagation()}>
          <button
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg bg-secondary text-foreground whitespace-nowrap active:scale-95 transition-all"
            onClick={goToDetail}
          >
            <Eye className="w-3 h-3 shrink-0" /> التفاصيل
          </button>
          <button
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground whitespace-nowrap active:scale-95 transition-all disabled:opacity-50"
            onClick={handleChat}
            disabled={chatLoading}
          >
            {chatLoading
              ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              : <MessageCircle className="w-3 h-3 shrink-0" />}
            مراسلة
          </button>
        </div>
      </div>
    </div>
  );
}
