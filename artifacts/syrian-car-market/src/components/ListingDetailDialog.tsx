import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Phone, Clock, Calendar,
  DollarSign, ChevronLeft, ChevronRight, Bike, Car, Wrench,
  Building2, Hash,
} from "lucide-react";
import { ShareSheet } from "@/components/ShareSheet";
import type { ListingCardType } from "./ListingCard";
import { SaveButton } from "./SaveButton";
import type { ListingSaveType } from "@/hooks/use-saves";
import { ContactButtons } from "./ContactButtons";

const TYPE_LABELS: Record<ListingCardType, string> = {
  moto: "دراجة نارية",
  rental: "للإيجار",
  part: "قطعة غيار",
  junk: "خردة / معطوبة",
  plate: "لوحة مرور",
};

const TYPE_COLORS: Record<ListingCardType, string> = {
  moto: "bg-rose-100 text-rose-700",
  rental: "bg-blue-100 text-blue-700",
  part: "bg-orange-100 text-orange-700",
  junk: "bg-slate-100 text-slate-700",
  plate: "bg-amber-100 text-amber-700",
};

function getTitle(type: ListingCardType, data: any): string {
  switch (type) {
    case "moto": return [data.brand, data.model, data.year].filter(Boolean).join(" ") || "دراجة نارية";
    case "rental": return [data.brand, data.model, data.year].filter(Boolean).join(" ") || "سيارة للإيجار";
    case "part": return data.name || "قطعة غيار";
    case "junk": return [data.type, data.model, data.year].filter(Boolean).join(" ") || "سيارة معطوبة";
    case "plate": return data.brand || "لوحة مميزة";
  }
}

function getImages(type: ListingCardType, data: any): string[] {
  if (type === "plate" && data.primaryImage) return [data.primaryImage];
  return data.images ?? [];
}

interface ListingDetailDialogProps {
  open: boolean;
  onClose: () => void;
  type: ListingCardType;
  data: any;
  onChat?: () => void;
  chatLoading?: boolean;
  currentUserId?: number;
}

export function ListingDetailDialog({
  open, onClose, type, data, onChat, chatLoading, currentUserId,
}: ListingDetailDialogProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = getImages(type, data);
  const title = getTitle(type, data);
  const sellerId = data.sellerId ?? data.userId ?? 0;
  const isOwner = currentUserId != null && currentUserId === sellerId;

  const goNext = () => setImgIdx(i => (i + 1) % images.length);
  const goPrev = () => setImgIdx(i => (i - 1 + images.length) % images.length);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Image gallery */}
        <div className="relative bg-muted">
          {type === "plate" && !images[0] ? (
            <div className="w-full h-48 bg-gradient-to-br from-amber-50 to-amber-100 flex flex-col items-center justify-center gap-2">
              <div className="bg-amber-400 text-amber-900 font-black text-3xl tracking-widest px-8 py-3 rounded-xl border-4 border-amber-600 shadow-lg">
                {data.brand?.replace(/^[^:]+:\s*/, "") ?? "لوحة مميزة"}
              </div>
              <span className="text-sm text-amber-700 font-semibold">لوحة مرور سورية</span>
            </div>
          ) : images.length > 0 ? (
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={images[imgIdx]} alt={title} className="w-full h-full object-cover" />
              {images.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIdx(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? "bg-white" : "bg-white/40"}`}
                      />
                    ))}
                  </div>
                  <span className="absolute bottom-2 right-3 text-white text-xs bg-black/50 rounded-md px-2 py-0.5">
                    {imgIdx + 1}/{images.length}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-40 flex items-center justify-center text-muted-foreground/30">
              {type === "moto" ? <Bike className="w-16 h-16" /> :
               type === "part" ? <Wrench className="w-16 h-16" /> :
               type === "plate" ? <Hash className="w-16 h-16" /> :
               <Car className="w-16 h-16" />}
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-3 right-3">
            <Badge className={`${TYPE_COLORS[type]} border-0 text-xs font-bold`}>
              {TYPE_LABELS[type]}
            </Badge>
          </div>
          {data.isFeatured && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-amber-500 text-white border-0">مميز ⭐</Badge>
            </div>
          )}
          {data.showroomId && !data.isFeatured && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-blue-600 text-white border-0 gap-1 text-xs">
                <Building2 className="w-3 h-3" /> معرض
              </Badge>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold leading-snug text-right">{title}</DialogTitle>
          </DialogHeader>

          {/* Rental prices */}
          {type === "rental" && (
            <div className="flex flex-wrap gap-2">
              {data.dailyPrice && (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-xl px-3 py-1.5 text-sm font-bold border border-green-100">
                  <Clock className="w-4 h-4" /> ${Number(data.dailyPrice).toLocaleString()}<span className="font-normal text-green-600">/يوم</span>
                </div>
              )}
              {data.weeklyPrice && (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-xl px-3 py-1.5 text-sm font-bold border border-green-100">
                  <Calendar className="w-4 h-4" /> ${Number(data.weeklyPrice).toLocaleString()}<span className="font-normal text-green-600">/أسبوع</span>
                </div>
              )}
              {data.monthlyPrice && (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-xl px-3 py-1.5 text-sm font-bold border border-green-100">
                  <DollarSign className="w-4 h-4" /> ${Number(data.monthlyPrice).toLocaleString()}<span className="font-normal text-green-600">/شهر</span>
                </div>
              )}
            </div>
          )}

          {/* Price */}
          {type !== "rental" && data.price != null && (
            <p className="text-2xl font-extrabold text-primary" dir="ltr">${Number(data.price).toLocaleString()}</p>
          )}
          {type !== "rental" && !data.price && (
            <p className="text-sm text-muted-foreground">السعر قابل للتفاوض</p>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {data.city && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{data.city}</span>
              </div>
            )}
            {(data.sellerName || data.userName) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-medium">{data.sellerName ?? data.userName}</span>
              </div>
            )}
            {data.sellerPhone && (
              <div className="flex items-center gap-1.5 text-muted-foreground" dir="ltr">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{data.sellerPhone}</span>
              </div>
            )}
            {data.year && type !== "plate" && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>سنة {data.year}</span>
              </div>
            )}
          </div>

          {/* Type-specific badges */}
          <div className="flex flex-wrap gap-2">
            {type === "junk" && data.condition && (
              <Badge className={data.condition === "خردة كاملة" ? "bg-destructive/10 text-destructive border-0" : "bg-amber-100 text-amber-700 border-0"}>
                {data.condition}
              </Badge>
            )}
            {type === "part" && data.condition && (
              <Badge variant="secondary">{data.condition}</Badge>
            )}
            {type === "part" && (data.carType || data.model) && (
              <Badge variant="outline">{[data.carType, data.model].filter(Boolean).join(" • ")}</Badge>
            )}
            {type === "moto" && data.brand && (
              <Badge variant="secondary">{data.brand}</Badge>
            )}
            {type === "plate" && data.brand && (
              <Badge className="bg-amber-100 text-amber-800 border-0">{data.brand.split(":")[0]?.trim()}</Badge>
            )}
          </div>

          {/* Description */}
          {data.description && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-sm text-foreground leading-relaxed">{data.description}</p>
            </div>
          )}

          {/* Contact buttons */}
          {!isOwner && (
            <ContactButtons
              phone={data.sellerPhone ?? data.phone ?? null}
              sellerId={sellerId || null}
              listingId={data.id}
              listingTitle={title}
              onInAppMessage={onChat}
              chatLoading={chatLoading}
              size="lg"
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 flex-wrap">
            <SaveButton type={type as ListingSaveType} id={data.id} />
            <ShareSheet
              options={{
                title,
                price: data.price ?? data.dailyPrice ?? null,
                city: data.city ?? null,
                url: `${window.location.origin}/listing/${data.id}`,
                description: data.description ?? null,
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
