// UI_ID: SCRAP_CENTERS_01
// NAME: مراكز الخردة
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { ShareSheet } from "@/components/ShareSheet";
import {
  Wrench, MapPin, Phone, MessageCircle, Star, ShieldCheck,
  Loader2, Search, Recycle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StarRow({ rating, onRate }: { rating: number; onRate?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            "w-4 h-4 transition-colors",
            (hovered || rating) >= i ? "fill-amber-400 text-amber-400" : "text-gray-300",
            onRate && "cursor-pointer hover:scale-110 transition-transform"
          )}
          onMouseEnter={() => onRate && setHovered(i)}
          onMouseLeave={() => onRate && setHovered(0)}
          onClick={() => onRate?.(i)}
        />
      ))}
      {rating > 0 && <span className="text-xs text-muted-foreground mr-1">{Number(rating).toFixed(1)}</span>}
    </div>
  );
}

function CenterCard({ center }: { center: any }) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { startChat, loading: chatLoading } = useStartChat();
  const [localRating, setLocalRating] = useState<number>(Number(center.rating) || 0);
  const [rated, setRated] = useState(false);

  const handleRate = async (score: number) => {
    if (!user) { navigate("/login"); return; }
    if (rated) return;
    try {
      const res = await fetch(withApi(`/api/scrap-centers/${center.id}/rate`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("scm_token")}` },
        body: JSON.stringify({ rating: score }),
      });
      const data = await res.json();
      setLocalRating(data.rating ?? score);
      setRated(true);
    } catch { setLocalRating(score); setRated(true); }
  };

  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col",
      center.isFeatured && "border-orange-300 ring-1 ring-orange-200"
    )}>
      <div className={cn(
        "px-4 py-3 flex items-start gap-3 border-b",
        center.isFeatured ? "bg-orange-50 border-orange-100" : "bg-muted/30"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center",
          center.isFeatured ? "bg-orange-100 border border-orange-200" : "bg-orange-500/10 border"
        )}>
          {center.logo
            ? <img src={withApi(center.logo)} alt={center.name} className="w-full h-full object-cover" />
            : <Recycle className={cn("w-6 h-6", center.isFeatured ? "text-orange-600" : "text-orange-500/70")} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm text-foreground leading-tight">{center.name}</h3>
            {center.isVerified && (
              <span className="flex items-center gap-0.5 text-xs text-green-600 font-semibold">
                <ShieldCheck className="w-3 h-3" /> موثّق
              </span>
            )}
          </div>
          {center.isFeatured && (
            <span className="text-xs text-orange-600 font-semibold flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-orange-500 text-orange-500" /> مركز مميز
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2 flex-1">
        <StarRow rating={localRating} onRate={!rated ? handleRate : undefined} />
        {rated && <p className="text-xs text-green-600 font-medium">شكراً على تقييمك!</p>}

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-500/60" />
          <span>{[center.address, center.city].filter(Boolean).join("، ")}</span>
        </div>

        {center.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span dir="ltr">{center.phone}</span>
          </div>
        )}

        {center.acceptedTypes && (
          <div className="flex flex-wrap gap-1 mt-2">
            {center.acceptedTypes.split(",").slice(0, 3).map((t: string, i: number) => (
              <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2 py-0.5">
                {t.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        {user && center.ownerUserId && user.id === center.ownerUserId ? (
          <button
            onClick={() => navigate(`/scrap-center/${center.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-600 text-white rounded-xl py-2 text-xs font-bold transition-colors hover:bg-orange-700"
          >
            <Recycle className="w-3.5 h-3.5" /> عرض صفحة مركزي
          </button>
        ) : (
          <>
            {center.phone && (
              <a href={`tel:${center.phone}`} className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl px-3 py-2 text-xs font-bold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Phone className="w-3.5 h-3.5" /> اتصال
              </a>
            )}
            {center.ownerUserId && (
              <button
                disabled={chatLoading}
                onClick={() => { if (!user) { navigate("/login"); return; } startChat(center.ownerUserId); }}
                className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl px-3 py-2 text-xs font-bold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><MessageCircle className="w-3.5 h-3.5" /> مراسلة</>}
              </button>
            )}
          </>
        )}
        <ShareSheet
          options={{ title: center.name, city: center.city, url: `${baseUrl}/scrap-center/${center.id}`, description: center.description }}
          className="flex items-center justify-center gap-1.5 border rounded-xl px-3 py-2 text-xs font-bold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        />
      </div>
    </div>
  );
}

export default function ScrapCentersPage() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const { data: centers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/scrap-centers"],
    queryFn: () => fetch(withApi("/api/scrap-centers")).then(r => r.json()),
    staleTime: 60_000,
  });

  const list = Array.isArray(centers) ? centers : [];
  const cities = [...new Set(list.map((c: any) => c.city).filter(Boolean))];

  const filtered = list.filter((c: any) => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase());
    const matchCity = !cityFilter || c.city === cityFilter;
    return matchSearch && matchCity;
  });

  const featured = filtered.filter((c: any) => c.isFeatured);
  const regular = filtered.filter((c: any) => !c.isFeatured);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="relative overflow-hidden bg-gradient-to-l from-orange-700 to-orange-500 text-white px-4 pt-6 pb-5">
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Recycle className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">مراكز بيع الخردة</h1>
          </div>
          <p className="text-white/80 text-sm">مراكز موثّقة لشراء وبيع قطع الغيار والسيارات</p>
        </div>
        <div className="absolute left-4 bottom-4 opacity-10 pointer-events-none">
          <Recycle className="w-32 h-32" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 pb-24">
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن مركز خردة..."
              className="w-full border rounded-xl pr-9 pl-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            <option value="">كل المدن</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-orange-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Recycle className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-bold">لا توجد مراكز خردة</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                  المراكز المميزة
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map((c: any) => <CenterCard key={c.id} center={c} />)}
                </div>
              </div>
            )}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                    <Recycle className="w-4 h-4 text-orange-600" />
                    جميع المراكز
                    <span className="text-sm font-normal text-muted-foreground">({regular.length})</span>
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regular.map((c: any) => <CenterCard key={c.id} center={c} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
