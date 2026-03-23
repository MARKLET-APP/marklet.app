import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/lib/auth";
import { Loader2, MapPin, Phone, MessageCircle, Car, Star, ShieldCheck, Building2, ChevronRight } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { useStartChat } from "@/hooks/use-start-chat";

export default function ShowroomPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { startChat, loading: chatLoading } = useStartChat();

  const { data: showroom, isLoading } = useQuery<any>({
    queryKey: ["/showrooms", id],
    queryFn: () => fetch(withApi(`/api/showrooms/${id}`)).then(r => r.json()),
    enabled: !isNaN(id),
  });

  const { data: cars = [], isLoading: loadingCars } = useQuery<any[]>({
    queryKey: ["/showrooms", id, "cars"],
    queryFn: () => fetch(withApi(`/api/showrooms/${id}/cars`)).then(r => r.json()),
    enabled: !isNaN(id),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!showroom || showroom.error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
      <Building2 className="w-16 h-16 text-muted-foreground/40" />
      <p className="text-xl font-bold text-muted-foreground">المعرض غير موجود</p>
      <button onClick={() => navigate("/")} className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm">العودة للرئيسية</button>
    </div>
  );

  const carsCount = Array.isArray(cars) ? cars.length : 0;

  return (
    <div className="min-h-screen pb-24 bg-background" dir="rtl">

      {/* ── Cover ── */}
      <div className="relative w-full h-56 bg-gradient-to-br from-primary via-primary/80 to-emerald-700 overflow-hidden">
        {showroom.coverImage && (
          <img src={showroom.coverImage} alt={showroom.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1 as any)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Badges over cover */}
        <div className="absolute top-4 left-4 flex gap-2">
          {showroom.isVerified && (
            <span className="flex items-center gap-1 bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <ShieldCheck className="w-3 h-3" /> موثّق
            </span>
          )}
          {showroom.isFeatured && (
            <span className="flex items-center gap-1 bg-amber-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <Star className="w-3 h-3 fill-white" /> مميّز
            </span>
          )}
        </div>
      </div>

      {/* ── Profile card ── */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative -mt-14 mb-5">
          <div className="bg-card border rounded-2xl shadow-lg p-5">
            {/* Logo + name row */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-20 h-20 rounded-xl border-2 border-border bg-muted shadow-sm overflow-hidden flex-shrink-0">
                {showroom.logo
                  ? <img src={showroom.logo} alt={showroom.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Building2 className="w-9 h-9 text-primary/60" /></div>
                }
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-xl font-bold text-foreground leading-tight mb-1">{showroom.name}</h1>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{showroom.city}{showroom.address ? ` — ${showroom.address}` : ""}</span>
                </div>
                {showroom.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(showroom.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground mr-0.5">{Number(showroom.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-primary/5 rounded-xl p-3 text-center border border-primary/10">
                <p className="text-2xl font-bold text-primary">{loadingCars ? "…" : carsCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">سيارة معروضة</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center border">
                <p className="text-2xl font-bold text-foreground">{showroom.city || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">المدينة</p>
              </div>
            </div>

            {/* Description */}
            {showroom.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 border-t pt-4">
                {showroom.description}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {(showroom.phone || showroom.whatsapp) && (
                <div className="grid grid-cols-2 gap-2">
                  {showroom.phone && (
                    <a
                      href={`tel:${showroom.phone}`}
                      className="flex items-center justify-center gap-2 bg-muted/60 hover:bg-muted border rounded-xl py-2.5 font-bold text-sm transition-colors"
                    >
                      <Phone className="w-4 h-4 text-primary" />
                      اتصال
                    </a>
                  )}
                  {showroom.whatsapp && (
                    <a
                      href={`https://wa.me/${showroom.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-bold text-sm transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      واتساب
                    </a>
                  )}
                </div>
              )}
              {showroom.ownerUserId && (
                <button
                  disabled={chatLoading || !user}
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    startChat(showroom.ownerUserId, undefined, undefined);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl py-2.5 font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><MessageCircle className="w-4 h-4" /> مراسلة المعرض</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Cars Section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              سيارات المعرض
            </h2>
            {!loadingCars && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{carsCount}</span>
            )}
          </div>

          {loadingCars ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : carsCount === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed">
              <Car className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-bold text-muted-foreground">لا توجد سيارات منشورة بعد</p>
              <p className="text-sm text-muted-foreground/70 mt-1">سيتم عرض سيارات هذا المعرض هنا</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(cars as any[]).map((car: any) => (
                <ListingCard key={car.id} type="car" data={car} currentUserId={user?.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
