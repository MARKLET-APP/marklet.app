// UI_ID: RE_DETAIL_01
// NAME: تفاصيل العقار
import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getRealEstateById, apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { useSaves } from "@/hooks/use-saves";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShareSheet } from "@/components/ShareSheet";
import AppRatingPopup from "@/components/AppRatingPopup";
import { ContactButtons } from "@/components/ContactButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Bed, Bath, Ruler, Layers, ChevronRight,
  Loader2, Building2, Calendar, Eye, Heart, Share2,
  MessageCircle, Crown, Lock, Star, Trash2,
} from "lucide-react";
import SellerRating from "@/components/SellerRating";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { imgUrl } from "@/lib/runtimeConfig";

function formatPrice(p: any) {
  if (!p) return null;
  return "$" + Number(p).toLocaleString("en-US");
}

const SUB_LABEL: Record<string, string> = {
  شقق: "شقة", "منازل وفيلات": "منزل / فيلا", "أراضي": "أرض",
  مكاتب: "مكتب", "محلات تجارية": "محل تجاري", مستودعات: "مستودع",
  استديو: "استوديو", غرفة: "غرفة",
};

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-secondary/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
      <div className="text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="font-bold text-foreground text-sm">{value}</p>
    </div>
  );
}


export default function RealEstateDetail() {
  const [, params] = useRoute("/real-estate/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { startChat, loading: chatLoading } = useStartChat();
  const { isSaved, toggleSave } = useSaves();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [brokenImgs, setBrokenImgs] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const deleteListingMutation = useMutation({
    mutationFn: () => apiRequest(`/api/real-estate/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان بنجاح" });
      qc.invalidateQueries({ queryKey: ["real-estate"] });
      navigate("/real-estate");
    },
    onError: () => toast({ title: "فشل حذف الإعلان", variant: "destructive" }),
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getRealEstateById(id)
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!item) return;
    document.title = `${item.title || "عقار"} | LAZEMNI`;
    return () => { document.title = "LAZEMNI"; };
  }, [item]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-32 text-muted-foreground">
        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="font-bold text-xl text-destructive">لم يتم العثور على هذا الإعلان.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/real-estate")}>العودة للعقارات</Button>
      </div>
    );
  }

  const images: string[] = Array.isArray(item.images)
    ? item.images
        .filter((u: any) => typeof u === "string" && u.trim().length > 0 && !u.startsWith("blob:"))
        .map((u: string) => imgUrl(u) ?? u)
    : [];
  const visibleImages = images.filter((_, i) => !brokenImgs.has(i));
  const safeIdx = Math.min(activeImg, Math.max(0, visibleImages.length - 1));

  const phone: string | null = item.phone || item.sellerPhone || null;
  const isOwner = !!user && item.sellerId === user.id;
  const isPremium = !!(user as any)?.subscriptionActive || !!(user as any)?.isFeaturedSeller;
  const isAdmin = (user as any)?.role === "admin";

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

  const handlePhoneClick = () => {
    if (!user) { navigate("/login"); return; }
    if (!isPremium && !isAdmin) {
      toast({ title: "هذه الميزة للمشتركين فقط", description: "اشترك في LAZEMNI للوصول لأرقام هواتف أصحاب العقارات." });
      return;
    }
    setShowPhone(true);
  };

  const markBroken = (idx: number) => setBrokenImgs(prev => new Set([...prev, idx]));

  return (
    <>
      {showRatingPopup && <AppRatingPopup forceOpen onClose={() => setShowRatingPopup(false)} />}

      <div className="py-6 px-4 max-w-2xl mx-auto pb-28" dir="rtl">

        {/* ── Back bar ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/real-estate")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="font-bold text-base truncate flex-1">{item.title}</span>
        </div>

        {/* ── Image Gallery ── */}
        <div className="bg-card rounded-3xl overflow-hidden border shadow-sm mb-6">
          <div className="aspect-[16/9] bg-muted relative">
            {visibleImages.length > 0 ? (
              <>
                <img
                  key={safeIdx}
                  src={visibleImages[safeIdx]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={() => {
                    const src = visibleImages[safeIdx];
                    const origIdx = images.indexOf(src);
                    if (origIdx !== -1) markBroken(origIdx);
                    setActiveImg(0);
                  }}
                />
                {item.isFeatured && (
                  <div className="absolute top-4 start-4">
                    <Badge className="bg-amber-500 text-black font-bold px-3 py-1.5 rounded-xl shadow-lg text-xs">مميز ⭐</Badge>
                  </div>
                )}
                {visibleImages.length > 1 && (
                  <div className="absolute top-3 end-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {safeIdx + 1} / {visibleImages.length}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Building2 className="w-16 h-16 opacity-20" />
              </div>
            )}
          </div>
          {visibleImages.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {visibleImages.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(idx)}
                  className={cn(
                    "w-16 h-12 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                    idx === safeIdx ? "border-primary shadow-md" : "border-transparent opacity-60 hover:opacity-90"
                  )}
                >
                  <img
                    src={src}
                    className="w-full h-full object-cover"
                    alt=""
                    onError={() => {
                      const origIdx = images.indexOf(src);
                      if (origIdx !== -1) markBroken(origIdx);
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Title & Price ── */}
        <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-foreground leading-snug">{item.title}</h1>
              {(item.province || item.city) && (
                <div className="flex items-center gap-2 text-muted-foreground mt-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{[item.city, item.province].filter(Boolean).join("، ")}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {item.price && <span className="text-2xl font-black text-primary">{formatPrice(item.price)}</span>}
              <div className="flex gap-1 flex-wrap justify-end">
                {item.listingType && (
                  <Badge className={cn("font-bold text-xs",
                    item.listingType === "بيع"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  )}>{item.listingType}</Badge>
                )}
                {item.subCategory && (
                  <Badge variant="outline" className="text-xs">{SUB_LABEL[item.subCategory] ?? item.subCategory}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            {(item.viewCount ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {item.viewCount} مشاهدة
              </span>
            )}
          </div>
        </div>

        {/* ── Specs ── */}
        {(item.area || item.rooms || item.bathrooms || item.floor != null || item.createdAt) && (
          <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">مواصفات العقار</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {item.area && <SpecItem icon={<Ruler className="w-5 h-5" />} label="المساحة" value={`${item.area} م²`} />}
              {item.rooms && <SpecItem icon={<Bed className="w-5 h-5" />} label="الغرف" value={String(item.rooms)} />}
              {item.bathrooms && <SpecItem icon={<Bath className="w-5 h-5" />} label="الحمامات" value={String(item.bathrooms)} />}
              {item.floor != null && item.floor !== "" && <SpecItem icon={<Layers className="w-5 h-5" />} label="الطابق" value={String(item.floor)} />}
              {(item.province || item.city) && <SpecItem icon={<MapPin className="w-5 h-5" />} label="الموقع" value={[item.city, item.province].filter(Boolean).join("، ")} />}
              {item.createdAt && <SpecItem icon={<Calendar className="w-5 h-5" />} label="تاريخ النشر" value={new Date(item.createdAt).toLocaleDateString("ar-SY")} />}
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {item.description && (
          <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">وصف العقار</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* ── تقييم صاحب الإعلان (مرئي للجميع، قابل للإرسال للمسجّلين) ── */}
        <SellerRating sellerId={item.sellerId} isOwner={isOwner} />

        {/* ── Location link ── */}
        {item.location && item.location.startsWith("http") && (
          <div className="bg-card rounded-3xl border shadow-sm p-4 mb-6">
            <a href={item.location} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary text-sm underline">
              <MapPin className="w-4 h-4 shrink-0" /> عرض الموقع على الخريطة
            </a>
          </div>
        )}

        {/* ── Seller contact card ── */}
        {!isOwner && (
          <div className="bg-card p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-lg mb-5 border-b pb-4">معلومات صاحب الإعلان</h3>

            {item.sellerName && (
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl shrink-0">
                  {item.sellerName[0]}
                </div>
                <div>
                  <p className="font-bold text-base">{item.sellerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">صاحب الإعلان</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Phone reveal block */}
              {!showPhone ? (
                <div className="space-y-2">
                  {!user ? (
                    <Button
                      onClick={() => navigate("/login")}
                      className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-primary text-primary-foreground shadow-lg"
                    >
                      <Eye className="w-5 h-5" /> سجّل دخولك لعرض الهاتف
                    </Button>
                  ) : (isPremium || isAdmin) ? (
                    phone ? (
                      <Button
                        onClick={handlePhoneClick}
                        className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-primary text-primary-foreground shadow-lg"
                      >
                        <Eye className="w-5 h-5" /> عرض رقم الهاتف
                      </Button>
                    ) : null
                  ) : (
                    <div className="space-y-2">
                      <div className="w-full rounded-xl border-2 border-muted bg-muted/30 px-4 h-12 flex items-center gap-3 overflow-hidden">
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-lg tracking-widest text-muted-foreground blur-sm select-none">+963 XX XXX XXXX</span>
                      </div>
                      <Button
                        onClick={() => toast({ title: "الاشتراك قريباً", description: "ميزة الاشتراك المدفوع ستكون متاحة قريباً!" })}
                        className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <Crown className="w-5 h-5" /> اشترك للوصول للأرقام
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 px-4 h-12 flex items-center justify-between">
                    <span dir="ltr" className="font-bold text-lg text-foreground font-mono tracking-wider">{phone}</span>
                    <button onClick={() => setShowPhone(false)} className="text-muted-foreground hover:text-foreground">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <ContactButtons
                    phone={phone}
                    sellerId={item.sellerId}
                    listingId={id}
                    listingTitle={item.title}
                    size="lg"
                  />
                </div>
              )}

              {/* In-app chat button — always available */}
              <Button
                onClick={handleChat}
                disabled={chatLoading}
                variant="outline"
                className="w-full rounded-xl h-12 text-base font-bold gap-2 border-2 border-primary/30 hover:bg-primary/5 hover:border-primary text-primary transition-all"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                {chatLoading ? "جارٍ الفتح..." : "بدء محادثة آمنة"}
              </Button>
            </div>

            <div className="mt-5 pt-5 border-t text-sm text-muted-foreground text-center">
              رقم الإعلان: #{id} <br />
              تاريخ النشر: {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-EG") : "—"}
            </div>
          </div>
        )}

        {/* ── Owner panel ── */}
        {isOwner && (
          <div className="bg-card p-5 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-base border-b pb-3 mb-4">إجراءات المالك</h3>
            {!deleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full rounded-xl gap-2"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" /> حذف الإعلان
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع.</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl gap-2"
                    onClick={() => deleteListingMutation.mutate()}
                    disabled={deleteListingMutation.isPending}
                  >
                    {deleteListingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    نعم، احذف
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleteListingMutation.isPending}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
