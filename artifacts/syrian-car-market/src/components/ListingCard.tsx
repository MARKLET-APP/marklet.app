import { useState } from "react";
import { MapPin, MessageCircle, Trash2, Loader2, DollarSign, Bike, Car, Wrench, Hash, ChevronLeft, ChevronRight, Phone, Calendar, Clock, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ListingCardType = "moto" | "rental" | "part" | "junk" | "plate";

interface ListingCardProps {
  type: ListingCardType;
  data: any;
  onChat?: () => void;
  onDelete?: () => void;
  chatLoading?: boolean;
  deleteLoading?: boolean;
  showSelf?: boolean;
  currentUserId?: number;
}

const PLACEHOLDER_ICONS: Record<ListingCardType, React.ReactNode> = {
  moto: <Bike className="w-12 h-12 text-muted-foreground/30" />,
  rental: <Car className="w-12 h-12 text-muted-foreground/30" />,
  part: <Wrench className="w-12 h-12 text-muted-foreground/30" />,
  junk: <Car className="w-12 h-12 text-muted-foreground/30" />,
  plate: null,
};

const TYPE_BADGE: Record<ListingCardType, { label: string; className: string }> = {
  moto: { label: "دراجة نارية", className: "bg-rose-100 text-rose-700 border-0" },
  rental: { label: "للإيجار", className: "bg-blue-100 text-blue-700 border-0" },
  part: { label: "قطعة غيار", className: "bg-orange-100 text-orange-700 border-0" },
  junk: { label: "خردة / معطوبة", className: "bg-slate-100 text-slate-700 border-0" },
  plate: { label: "لوحة مرور", className: "bg-amber-100 text-amber-700 border-0" },
};

function getTitle(type: ListingCardType, data: any): string {
  switch (type) {
    case "moto":
      return [data.brand, data.model, data.year].filter(Boolean).join(" ") || "دراجة نارية";
    case "rental":
      return [data.brand, data.model, data.year].filter(Boolean).join(" ") || "سيارة للإيجار";
    case "part":
      return data.name || "قطعة غيار";
    case "junk":
      return [data.type, data.model, data.year].filter(Boolean).join(" ") || "سيارة معطوبة";
    case "plate":
      return data.brand || "لوحة مميزة";
  }
}

function getImages(type: ListingCardType, data: any): string[] {
  if (type === "plate" && data.primaryImage) return [data.primaryImage];
  return data.images ?? [];
}

function getSellerId(data: any): number {
  return data.sellerId ?? data.userId ?? 0;
}

export function ListingCard({ type, data, onChat, onDelete, chatLoading, deleteLoading, currentUserId }: ListingCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = getImages(type, data);
  const currentImg = images[imgIdx] ?? null;
  const hasMultiple = images.length > 1;
  const sellerId = getSellerId(data);
  const isOwner = currentUserId != null && currentUserId === sellerId;
  const title = getTitle(type, data);
  const badge = TYPE_BADGE[type];

  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); };
  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); };

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative">
        {type === "plate" && !currentImg ? (
          <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 flex flex-col items-center justify-center gap-2 border-b">
            <div className="bg-amber-400 text-amber-900 font-black text-2xl tracking-widest px-6 py-2 rounded-lg border-4 border-amber-600 shadow-md">
              {data.brand?.replace(/^[^:]+:\s*/, "") ?? "لوحة مميزة"}
            </div>
            <span className="text-xs text-amber-700 font-semibold">لوحة مرور سورية</span>
          </div>
        ) : currentImg ? (
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={currentImg}
              alt={title}
              className="w-full h-full object-cover"
            />
            {hasMultiple && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center z-10"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center z-10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {images.map((_, i) => (
                    <span key={i} className={`block w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? "bg-white" : "bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-40 bg-muted flex items-center justify-center">
            {PLACEHOLDER_ICONS[type]}
          </div>
        )}

        {/* Badge overlay */}
        <div className="absolute top-2 right-2">
          <Badge className={badge.className}>{badge.label}</Badge>
        </div>
        {data.isFeatured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500 text-white border-0">مميز</Badge>
          </div>
        )}
        {data.showroomId && !data.isFeatured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-600 text-white border-0 gap-1 text-[10px]">
              <Building2 className="w-2.5 h-2.5" /> معرض
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-foreground leading-tight">{title}</h3>

        {/* Type-specific fields */}
        {type === "part" && (data.carType || data.model) && (
          <p className="text-sm text-muted-foreground">{[data.carType, data.model, data.year].filter(Boolean).join(" • ")}</p>
        )}

        {type === "junk" && data.condition && (
          <Badge className={data.condition === "خردة كاملة" ? "bg-destructive/10 text-destructive text-xs border-0" : "bg-amber-100 text-amber-700 text-xs border-0"}>
            {data.condition}
          </Badge>
        )}

        {type === "part" && data.condition && (
          <Badge variant="secondary" className="text-xs">{data.condition}</Badge>
        )}

        {/* Rental prices */}
        {type === "rental" && (
          <div className="flex flex-wrap gap-1.5">
            {data.dailyPrice && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold border border-green-100">
                <Clock className="w-3 h-3" /> ${Number(data.dailyPrice).toLocaleString()}/يوم
              </div>
            )}
            {data.weeklyPrice && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold border border-green-100">
                <Calendar className="w-3 h-3" /> ${Number(data.weeklyPrice).toLocaleString()}/أسبوع
              </div>
            )}
            {data.monthlyPrice && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold border border-green-100">
                <DollarSign className="w-3 h-3" /> ${Number(data.monthlyPrice).toLocaleString()}/شهر
              </div>
            )}
          </div>
        )}

        {/* Price (for non-rental) */}
        {type !== "rental" && (
          <div className="flex items-center justify-between pt-0.5">
            {data.price ? (
              <span className="font-bold text-primary" dir="ltr">${Number(data.price).toLocaleString()}</span>
            ) : (
              <span className="text-muted-foreground text-sm">السعر قابل للتفاوض</span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {data.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{data.city}</span>}
          {data.sellerName && <span>{data.sellerName}</span>}
          {type === "rental" && data.sellerPhone && (
            <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" />{data.sellerPhone}</span>
          )}
        </div>

        {data.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {!isOwner && onChat && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 rounded-xl text-xs font-bold"
              onClick={onChat}
              disabled={chatLoading}
            >
              {chatLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <MessageCircle className="w-3.5 h-3.5" />
              }
              مراسلة البائع
            </Button>
          )}
          {isOwner && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-destructive hover:bg-destructive/10 rounded-xl gap-1.5 text-xs"
              onClick={onDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              حذف
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
