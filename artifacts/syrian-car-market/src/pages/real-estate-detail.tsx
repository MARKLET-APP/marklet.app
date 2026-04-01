// UI_ID: RE_DETAIL_01
// NAME: تفاصيل العقار
import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getRealEstateById } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { useSaves } from "@/hooks/use-saves";
import { ShareSheet } from "@/components/ShareSheet";
import AppRatingPopup from "@/components/AppRatingPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Bed, Bath, Ruler, Layers, ChevronRight, ChevronLeft,
  Phone, MessageCircle, Loader2, Building2, Calendar, Eye,
  Heart, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatPrice(p: any) {
  if (!p) return null;
  return "$" + Number(p).toLocaleString();
}

const SUB_LABEL: Record<string, string> = {
  شقق: "شقة", "منازل وفيلات": "منزل / فيلا", "أراضي": "أرض",
  مكاتب: "مكتب", "محلات تجارية": "محل تجاري", مستودعات: "مستودع",
  استديو: "استوديو", غرفة: "غرفة",
};

export default function RealEstateDetail() {
  const [, params] = useRoute("/real-estate/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { startChat, loading: chatLoading } = useStartChat();
  const { isSaved, toggleSave } = useSaves();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showRatingPopup, setShowRatingPopup] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getRealEstateById(id)
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Building2 className="w-16 h-16 opacity-30" />
        <p className="text-lg">لم يتم العثور على هذا الإعلان</p>
        <Button variant="outline" onClick={() => navigate("/real-estate")}>
          العودة للعقارات
        </Button>
      </div>
    );
  }

  const images: string[] = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : [];

  const phone: string | null = item.phone || item.sellerPhone || null;
  const isOwner = user && item.sellerId === user.id;

  const shareOptions = {
    title: item.title,
    price: item.price ? formatPrice(item.price) : null,
    city: [item.city, item.province].filter(Boolean).join("، ") || null,
    url: `https://marklet.net/real-estate/${id}`,
    description: item.description || null,
  };

  const handleChat = () => {
    if (!user) { navigate("/login"); return; }
    if (item.sellerId) {
      startChat(item.sellerId, `مرحباً، أنا مهتم بعقارك "${item.title}". هل ما زال متاحاً؟`);
      const alreadyRated = localStorage.getItem("app_rated");
      if (!alreadyRated) setTimeout(() => setShowRatingPopup(true), 1500);
    }
  };

  const handleCall = () => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto pb-32" dir="rtl">

      {/* App rating popup */}
      {showRatingPopup && (
        <AppRatingPopup forceOpen onClose={() => setShowRatingPopup(false)} />
      )}

      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/real-estate")} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="font-bold text-base truncate flex-1">{item.title}</span>
      </div>

      {/* ── Image Gallery ── */}
      <div className="bg-card border-b">
        {/* Main image */}
        <div className="relative aspect-video bg-muted">
          {images.length > 0 ? (
            <>
              <img
                src={images[activeImg]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg(i => Math.max(0, i - 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 disabled:opacity-30"
                    disabled={activeImg === 0}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImg(i => Math.min(images.length - 1, i + 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 disabled:opacity-30"
                    disabled={activeImg === images.length - 1}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={cn("w-2 h-2 rounded-full transition-all",
                          i === activeImg ? "bg-white scale-125" : "bg-white/50"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
              {item.isFeatured && (
                <div className="absolute top-3 start-3">
                  <Badge className="bg-amber-500 text-black font-bold text-xs px-2 py-1">مميز ⭐</Badge>
                </div>
              )}
              {/* Image counter */}
              <div className="absolute top-3 end-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {activeImg + 1} / {images.length}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-20 h-20 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-muted/30">
            {images.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImg(idx)}
                className={cn(
                  "w-16 h-12 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                  idx === activeImg
                    ? "border-primary shadow-md"
                    : "border-transparent opacity-60 hover:opacity-90"
                )}
              >
                <img src={src} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">

        {/* Title + badges + actions row */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("font-bold",
              item.listingType === "بيع" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
            )}>
              {item.listingType}
            </Badge>
            {item.subCategory && (
              <Badge variant="outline">{SUB_LABEL[item.subCategory] ?? item.subCategory}</Badge>
            )}
          </div>
          <h1 className="text-xl font-bold leading-snug">{item.title}</h1>
          {(item.province || item.city) && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              {[item.city, item.province].filter(Boolean).join("، ")}
            </p>
          )}
        </div>

        {/* Share / Save / Views row */}
        <div className="flex items-center gap-1 border-b pb-4">
          <ShareSheet
            options={shareOptions}
            trigger={
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/5">
                <Share2 className="w-4 h-4" /> مشاركة
              </button>
            }
          />
          {user && !isOwner && (
            <button
              onClick={() => toggleSave("real_estate", id)}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-xl",
                isSaved("real_estate", id)
                  ? "text-rose-500 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              )}
            >
              <Heart className={cn("w-4 h-4", isSaved("real_estate", id) && "fill-rose-500 text-rose-500")} />
              {isSaved("real_estate", id) ? "محفوظ" : "حفظ"}
            </button>
          )}
          {item.viewCount > 0 && (
            <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {item.viewCount} مشاهدة
            </span>
          )}
        </div>

        {/* Price */}
        {item.price && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">السعر</p>
            <p className="text-3xl font-bold text-primary">{formatPrice(item.price)}</p>
            {item.currency && item.currency !== "USD" && (
              <p className="text-xs text-muted-foreground mt-1">{item.currency}</p>
            )}
          </div>
        )}

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3">
          {item.area && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">المساحة</p>
                <p className="font-bold">{item.area} م²</p>
              </div>
            </div>
          )}
          {item.rooms && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Bed className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">الغرف</p>
                <p className="font-bold">{item.rooms}</p>
              </div>
            </div>
          )}
          {item.bathrooms && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Bath className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">الحمامات</p>
                <p className="font-bold">{item.bathrooms}</p>
              </div>
            </div>
          )}
          {item.floor !== null && item.floor !== undefined && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">الطابق</p>
                <p className="font-bold">{item.floor}</p>
              </div>
            </div>
          )}
          {item.createdAt && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">تاريخ النشر</p>
                <p className="font-bold text-xs">{new Date(item.createdAt).toLocaleDateString("ar-SY")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Location link */}
        {item.location && (
          <a
            href={item.location}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary text-sm underline"
          >
            <MapPin className="w-4 h-4" />
            عرض الموقع على الخريطة
          </a>
        )}

        {/* Description */}
        {item.description && (
          <div className="space-y-2">
            <h3 className="font-bold text-base">وصف العقار</h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Seller card */}
        {item.sellerName && (
          <div className="border rounded-2xl p-4 flex items-center gap-3 bg-card">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg shrink-0">
              {item.sellerName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">صاحب الإعلان</p>
              <p className="font-bold truncate">{item.sellerName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom contact bar */}
      <div className="fixed bottom-0 right-0 left-0 z-50 lg:hidden bg-background/95 backdrop-blur-sm border-t shadow-lg px-4 py-3 flex gap-2">
        {phone ? (
          <>
            <Button
              className="flex-1 rounded-xl h-12 font-bold gap-2"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4" />
              اتصال
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12 font-bold gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </Button>
            {user && !isOwner && (
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-12 font-bold gap-2"
                onClick={handleChat}
                disabled={chatLoading}
              >
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                محادثة
              </Button>
            )}
          </>
        ) : (
          <Button
            className="flex-1 rounded-xl h-12 font-bold gap-2"
            onClick={handleChat}
            disabled={chatLoading || isOwner}
          >
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {isOwner ? "إعلانك" : "تواصل مع صاحب الإعلان"}
          </Button>
        )}
      </div>
    </div>
  );
}
