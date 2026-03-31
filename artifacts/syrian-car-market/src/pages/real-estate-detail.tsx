// UI_ID: RE_DETAIL_01
// NAME: تفاصيل العقار
import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getRealEstateById } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Bed, Bath, Ruler, Layers, ChevronRight, ChevronLeft,
  Phone, MessageCircle, Loader2, Building2, Calendar, Eye,
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

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showPhone, setShowPhone] = useState(false);

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

  const handleChat = () => {
    if (!user) { navigate("/login"); return; }
    if (item.sellerId) startChat(item.sellerId);
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

      {/* Back */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/real-estate")} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="font-bold text-base truncate">{item.title}</span>
      </div>

      {/* Images */}
      {images.length > 0 ? (
        <div className="relative aspect-video bg-muted">
          <img
            src={images[activeImg]}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setActiveImg(i => Math.max(0, i - 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveImg(i => Math.min(images.length - 1, i + 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5"
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
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <Building2 className="w-20 h-20 text-muted-foreground/30" />
        </div>
      )}

      <div className="p-4 space-y-5">

        {/* Title + badges */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("font-bold",
              item.listingType === "بيع" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            )}>
              {item.listingType}
            </Badge>
            {item.subCategory && (
              <Badge variant="outline">{SUB_LABEL[item.subCategory] ?? item.subCategory}</Badge>
            )}
            {item.isFeatured && (
              <Badge className="bg-amber-100 text-amber-800">مميز</Badge>
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

        {/* Price */}
        {item.price && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">السعر</p>
            <p className="text-3xl font-bold text-primary">{formatPrice(item.price)}</p>
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
          {item.viewCount > 0 && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">المشاهدات</p>
                <p className="font-bold">{item.viewCount}</p>
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

        {/* Seller */}
        {item.sellerName && (
          <div className="border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {item.sellerName[0]}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">صاحب الإعلان</p>
              <p className="font-bold">{item.sellerName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom contact bar */}
      <div className="fixed bottom-0 right-0 left-0 bg-background border-t p-3 flex gap-2 z-20">
        {phone ? (
          <>
            <Button
              className="flex-1 rounded-xl h-12 font-bold gap-2"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4" />
              {showPhone ? phone : "اتصال"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12 font-bold gap-2 border-green-500 text-green-600 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </Button>
          </>
        ) : (
          <Button
            className="flex-1 rounded-xl h-12 font-bold gap-2"
            onClick={handleChat}
            disabled={chatLoading}
          >
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            تواصل مع صاحب الإعلان
          </Button>
        )}
      </div>
    </div>
  );
}
