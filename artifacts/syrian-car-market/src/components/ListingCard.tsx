import { useState } from "react";
import { MapPin, MessageCircle, Trash2, Loader2, DollarSign, Bike, Car, Wrench, ChevronLeft, ChevronRight, Phone, Calendar, Clock, Building2, Eye, Briefcase, Ruler, Bed, Building, Share2, ShoppingBag, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ShareSheet } from "@/components/ShareSheet";
import { imgUrl } from "@/lib/runtimeConfig";

export type ListingCardType = "moto" | "rental" | "part" | "junk" | "plate" | "real-estate" | "jobs" | "marketplace";

interface ListingCardProps {
  type?: ListingCardType;
  data?: any;
  ad?: { type: ListingCardType; data: any };
  onChat?: () => void;
  onDelete?: () => void;
  onCardClick?: () => void;
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
  "real-estate": <Building2 className="w-12 h-12 text-muted-foreground/30" />,
  jobs: <Briefcase className="w-12 h-12 text-muted-foreground/30" />,
  marketplace: <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />,
};

const TYPE_BADGE: Record<ListingCardType, { label: string; className: string }> = {
  moto: { label: "دراجة نارية", className: "bg-rose-100 text-rose-700 border-0" },
  rental: { label: "للإيجار", className: "bg-blue-100 text-blue-700 border-0" },
  part: { label: "قطعة غيار", className: "bg-orange-100 text-orange-700 border-0" },
  junk: { label: "خردة / معطوبة", className: "bg-slate-100 text-slate-700 border-0" },
  plate: { label: "لوحة مرور", className: "bg-amber-100 text-amber-700 border-0" },
  "real-estate": { label: "عقار", className: "bg-teal-100 text-teal-700 border-0" },
  jobs: { label: "وظيفة", className: "bg-blue-100 text-blue-700 border-0" },
  marketplace: { label: "مستعمل", className: "bg-orange-100 text-orange-700 border-0" },
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
    case "real-estate":
      return data.title || "عقار";
    case "jobs":
      return data.title || "وظيفة";
    case "marketplace":
      return data.title || "سلعة مستعملة";
  }
}

function getImages(type: ListingCardType, data: any): string[] {
  if (type === "plate" && data.primaryImage) return [data.primaryImage];
  if (type === "jobs") return [];
  if (type === "real-estate" || type === "marketplace") {
    return (data.images ?? []).filter(
      (u: any) => typeof u === "string" && u.trim().length > 0 && !u.startsWith("blob:")
    );
  }
  return data.images ?? [];
}

function getSellerId(data: any, type: ListingCardType): number {
  if (type === "jobs") return data.posterId ?? 0;
  if (type === "real-estate" || type === "marketplace") return data.sellerId ?? 0;
  return data.sellerId ?? data.userId ?? 0;
}

export function ListingCard({ type: typeProp, data: dataProp, ad, onChat, onDelete, onCardClick, chatLoading, deleteLoading, currentUserId }: ListingCardProps) {
  const type = (ad?.type ?? typeProp) as ListingCardType;
  const data = ad?.data ?? dataProp;
  const [imgIdx, setImgIdx] = useState(0);
  const images = getImages(type, data);
  const currentImg = images[imgIdx] ?? null;
  const hasMultiple = images.length > 1;
  const sellerId = getSellerId(data, type);
  const isOwner = currentUserId != null && currentUserId === sellerId;
  const title = getTitle(type, data);
  const badge = TYPE_BADGE[type];

  // Dynamic badge label for real-estate & jobs
  const badgeLabel =
    type === "real-estate" ? (data.listingType || badge.label) :
    type === "jobs"        ? (data.subCategory  || badge.label) :
    badge.label;

  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); };
  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); };

  return (
    <div
      className={`tap-card flex flex-col h-full bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${onCardClick ? "cursor-pointer" : ""}`}
      onClick={onCardClick}
    >
      {/* ── Image ── */}
      <div className="relative shrink-0">
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
              src={imgUrl(currentImg)}
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
          <div className="w-full h-36 bg-muted flex items-center justify-center">
            {PLACEHOLDER_ICONS[type]}
          </div>
        )}

        <div className="absolute top-2 right-2">
          <Badge className={badge.className}>{badgeLabel}</Badge>
        </div>
        {data.isFeatured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500 text-white border-0">⭐ مميز</Badge>
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

      {/* ── Content ── */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-sm text-foreground line-clamp-1">{title}</h3>

        {/* ── Part metadata ── */}
        {type === "part" && (data.carType || data.model) && (
          <p className="text-xs text-muted-foreground line-clamp-1">{[data.carType, data.model, data.year].filter(Boolean).join(" • ")}</p>
        )}

        {/* ── Junk condition ── */}
        {type === "junk" && data.condition && (
          <Badge className={data.condition === "خردة كاملة" ? "bg-destructive/10 text-destructive text-xs border-0" : "bg-amber-100 text-amber-700 text-xs border-0"}>
            {data.condition}
          </Badge>
        )}

        {/* ── Part condition ── */}
        {type === "part" && data.condition && (
          <Badge variant="secondary" className="text-xs self-start">{data.condition}</Badge>
        )}

        {/* ── Rental prices ── */}
        {type === "rental" && (
          <div className="flex flex-wrap gap-1">
            {data.dailyPrice && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold border border-green-100">
                <Clock className="w-3 h-3 shrink-0" /> ${Number(data.dailyPrice).toLocaleString()}/يوم
              </div>
            )}
            {data.weeklyPrice && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold border border-green-100">
                <Calendar className="w-3 h-3 shrink-0" /> ${Number(data.weeklyPrice).toLocaleString()}/أسبوع
              </div>
            )}
            {data.monthlyPrice && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold border border-green-100">
                <DollarSign className="w-3 h-3 shrink-0" /> ${Number(data.monthlyPrice).toLocaleString()}/شهر
              </div>
            )}
          </div>
        )}

        {/* ── Real-estate specs ── */}
        {type === "real-estate" && (
          <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs font-medium text-foreground bg-secondary/50 p-2 rounded-xl">
            {data.area  && <span className="flex items-center gap-1"><Ruler className="w-3 h-3 text-primary shrink-0" />{data.area} م²</span>}
            {data.rooms && <span className="flex items-center gap-1"><Bed   className="w-3 h-3 text-primary shrink-0" />{data.rooms} غرف</span>}
            {(data.viewCount ?? data.viewsCount) != null && <span className="flex items-center gap-1 col-span-2"><Eye className="w-3 h-3 text-primary shrink-0" />مشاهدات: {data.viewCount ?? data.viewsCount}</span>}
          </div>
        )}

        {/* ── Marketplace metadata ── */}
        {type === "marketplace" && (
          <div className="flex flex-wrap gap-1">
            {data.condition && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{data.condition}</Badge>
            )}
            {data.category && (
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0.5">{data.category}</Badge>
            )}
            {data.shippingAvailable && (
              <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0.5 gap-0.5 flex items-center">
                <Truck className="w-2.5 h-2.5" /> شحن متاح
              </Badge>
            )}
          </div>
        )}

        {/* ── Jobs metadata ── */}
        {type === "jobs" && (
          <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs font-medium text-foreground bg-secondary/50 p-2 rounded-xl">
            {data.company && <span className="flex items-center gap-1 col-span-2"><Building className="w-3 h-3 text-primary shrink-0" />{data.company}</span>}
            {data.jobType && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-primary shrink-0" />{data.jobType}</span>}
            {data.salary  && <span className="flex items-center gap-1 text-primary font-bold">{data.salary}</span>}
            {(data.viewCount ?? data.viewsCount) != null && <span className="flex items-center gap-1 col-span-2"><Eye className="w-3 h-3 text-primary shrink-0" />مشاهدات: {data.viewCount ?? data.viewsCount}</span>}
          </div>
        )}

        {/* ── Price (all except rental & jobs) ── */}
        {type !== "rental" && type !== "jobs" && (
          <div className="flex items-center gap-1">
            {data.price ? (
              type === "marketplace"
                ? <span className="font-bold text-sm text-orange-600">{Number(data.price).toLocaleString()} ل.س</span>
                : <span className="font-bold text-sm text-primary" dir="ltr">${Number(data.price).toLocaleString()}</span>
            ) : (
              <span className="text-muted-foreground text-xs">السعر قابل للتفاوض</span>
            )}
          </div>
        )}

        {/* ── Location + seller ── */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {data.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{data.city}</span>}
          {(data.sellerName || data.posterName) && (
            <span className="truncate">{data.sellerName ?? data.posterName}</span>
          )}
          {type === "rental" && data.sellerPhone && (
            <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3 shrink-0" />{data.sellerPhone}</span>
          )}
        </div>

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
        )}

        {/* ── Actions — pinned to bottom ── */}
        {(() => {
          const isREorJob = type === "real-estate" || type === "jobs" || type === "marketplace";
          const shareUrl = type === "real-estate"
            ? `${window.location.origin}/real-estate/${data.id}`
            : type === "jobs"
            ? `${window.location.origin}/jobs/${data.id}`
            : type === "marketplace"
            ? `${window.location.origin}/marketplace/${data.id}`
            : `${window.location.origin}/listing/${data.id}`;
          return (
            <div className="flex gap-1.5 pt-2 border-t mt-auto" onClick={e => e.stopPropagation()}>
              {/* التفاصيل */}
              {onCardClick && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCardClick(); }}
                  className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg bg-secondary text-foreground whitespace-nowrap active:scale-95 transition-all"
                >
                  <Eye className="w-3 h-3 shrink-0" /> التفاصيل
                </button>
              )}

              {/* مراسلة — للعقارات والوظائف دائماً في مكان مشاركة */}
              {isREorJob ? (
                !isOwner && onChat ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onChat(); }}
                    disabled={chatLoading}
                    className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    مراسلة
                  </button>
                ) : isOwner && onDelete ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    disabled={deleteLoading}
                    className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg text-destructive border border-destructive/30 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    حذف
                  </button>
                ) : (
                  <ShareSheet
                    options={{ title, price: data.price ?? null, city: data.city ?? null, url: shareUrl, description: data.description ?? null }}
                    className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg bg-background text-muted-foreground border border-border whitespace-nowrap active:scale-95 transition-all"
                  />
                )
              ) : (
                /* أنواع أخرى — نفس السلوك القديم */
                <>
                  {!isOwner && onChat && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onChat(); }}
                      disabled={chatLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                      مراسلة
                    </button>
                  )}
                  {isOwner && onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      disabled={deleteLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg text-destructive border border-destructive/30 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      حذف
                    </button>
                  )}
                  <ShareSheet
                    options={{ title, price: data.price ?? data.dailyPrice ?? null, city: data.city ?? null, url: shareUrl, description: data.description ?? null }}
                    className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-[11px] font-medium rounded-lg bg-background text-muted-foreground border border-border whitespace-nowrap active:scale-95 transition-all"
                  />
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
