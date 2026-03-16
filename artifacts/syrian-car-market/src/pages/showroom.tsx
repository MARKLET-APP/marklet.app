import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api, apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Phone, MessageCircle, Car, Star, Shield, ShieldCheck, Building2, ExternalLink } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { useStartChat } from "@/hooks/use-start-chat";
import { useToast } from "@/hooks/use-toast";

export default function ShowroomPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { startChat, loading: chatLoading } = useStartChat();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: showroom, isLoading } = useQuery<any>({
    queryKey: ["/showrooms", id],
    queryFn: () => fetch(`${BASE}/api/showrooms/${id}`).then(r => r.json()),
    enabled: !isNaN(id),
  });

  const { data: cars = [], isLoading: loadingCars } = useQuery<any[]>({
    queryKey: ["/showrooms", id, "cars"],
    queryFn: () => fetch(`${BASE}/api/showrooms/${id}/cars`).then(r => r.json()),
    enabled: !isNaN(id),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!showroom || showroom.error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Building2 className="w-16 h-16 text-muted-foreground" />
      <p className="text-xl font-bold text-muted-foreground">المعرض غير موجود</p>
      <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
    </div>
  );

  return (
    <div className="min-h-screen pb-20" dir="rtl">
      {/* Cover Image */}
      <div className="relative w-full h-52 sm:h-72 bg-gradient-to-br from-primary/80 to-primary overflow-hidden">
        {showroom.coverImage ? (
          <img src={showroom.coverImage} alt={showroom.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <Building2 className="w-28 h-28 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Showroom Header */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-16 mb-6 flex items-end gap-5">
          {/* Logo */}
          <div className="w-28 h-28 rounded-2xl border-4 border-background bg-background shadow-xl overflow-hidden flex-shrink-0">
            {showroom.logo ? (
              <img src={showroom.logo} alt={showroom.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-primary" />
              </div>
            )}
          </div>
          {/* Name + badges */}
          <div className="pb-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{showroom.name}</h1>
              {showroom.isVerified && (
                <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                  <ShieldCheck className="w-3 h-3" /> موثّق
                </Badge>
              )}
              {showroom.isFeatured && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
                  <Star className="w-3 h-3 fill-white" /> مميّز
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <MapPin className="w-4 h-4" />
              <span>{showroom.city}{showroom.address ? ` — ${showroom.address}` : ""}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {showroom.description && (
          <div className="bg-muted/30 rounded-2xl p-5 mb-6 text-sm leading-relaxed text-foreground">
            {showroom.description}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {showroom.phone && (
            <a href={`tel:${showroom.phone}`} className="flex items-center justify-center gap-2 bg-card border rounded-xl py-3 font-bold text-sm hover:bg-muted/40 transition-colors">
              <Phone className="w-5 h-5 text-primary" /> اتصال بالمعرض
            </a>
          )}
          {showroom.whatsapp && (
            <a
              href={`https://wa.me/${showroom.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-bold text-sm transition-colors"
            >
              <MessageCircle className="w-5 h-5" /> واتساب
            </a>
          )}
          {showroom.ownerUserId && (
            <Button
              className="col-span-2 h-11 gap-2 font-bold"
              variant="outline"
              disabled={chatLoading || !user}
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                startChat(showroom.ownerUserId, undefined, undefined);
              }}
            >
              <MessageCircle className="w-5 h-5" />
              {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "مراسلة المعرض"}
            </Button>
          )}
        </div>

        {/* Cars Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              سيارات المعرض
              <span className="text-sm font-normal text-muted-foreground">({cars.length})</span>
            </h2>
          </div>

          {loadingCars ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : cars.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>لا يوجد سيارات منشورة من هذا المعرض</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cars.map((car: any) => (
                <ListingCard
                  key={car.id}
                  type="car"
                  data={car}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
