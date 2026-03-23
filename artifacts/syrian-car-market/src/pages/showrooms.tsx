import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { ShareSheet } from "@/components/ShareSheet";
import {
  Building2, MapPin, Phone, MessageCircle, Star, ShieldCheck,
  Loader2, Search, Car, ChevronLeft,
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

function ShowroomCard({ showroom }: { showroom: any }) {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { startChat, loading: chatLoading } = useStartChat();
  const [localRating, setLocalRating] = useState<number>(Number(showroom.rating) || 0);
  const [rated, setRated] = useState(false);

  const handleRate = async (score: number) => {
    if (!user) { navigate("/login"); return; }
    if (rated) return;
    try {
      const res = await fetch(withApi(`/api/showrooms/${showroom.id}/rate`), {
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
      showroom.isFeatured && "border-amber-300 ring-1 ring-amber-200"
    )}>
      {/* Header */}
      <div className={cn(
        "px-4 py-3 flex items-start gap-3 border-b",
        showroom.isFeatured ? "bg-amber-50 border-amber-100" : "bg-muted/30"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center",
          showroom.isFeatured ? "bg-amber-100 border border-amber-200" : "bg-primary/10 border"
        )}>
          {showroom.logo
            ? <img src={showroom.logo} alt={showroom.name} className="w-full h-full object-cover" />
            : <Building2 className={cn("w-6 h-6", showroom.isFeatured ? "text-amber-600" : "text-primary/60")} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm text-foreground leading-tight">{showroom.name}</h3>
            {showroom.isVerified && (
              <span className="flex items-center gap-0.5 text-xs text-green-600 font-semibold">
                <ShieldCheck className="w-3 h-3" /> موثّق
              </span>
            )}
          </div>
          {showroom.isFeatured && (
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> معرض مميز
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2 flex-1">
        <StarRow rating={localRating} onRate={!rated ? handleRate : undefined} />
        {rated && <p className="text-xs text-green-600 font-medium">شكراً على تقييمك!</p>}

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          <span>{[showroom.address, showroom.city].filter(Boolean).join("، ")}</span>
        </div>

        {showroom.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span dir="ltr">{showroom.phone}</span>
          </div>
        )}

        {showroom.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{showroom.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        {/* Owner: view profile button */}
        {user && showroom.ownerUserId && user.id === showroom.ownerUserId ? (
          <button
            onClick={() => navigate(`/showroom/${showroom.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white rounded-xl py-2 text-xs font-bold transition-colors hover:bg-primary/90"
          >
            <Building2 className="w-3.5 h-3.5" /> عرض صفحة معرضي
          </button>
        ) : (
          <>
            {showroom.phone && (
              <a href={`tel:${showroom.phone}`} className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl px-3 py-2 text-xs font-bold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Phone className="w-3.5 h-3.5" /> اتصال
              </a>
            )}
            {showroom.ownerUserId && (
              <button
                disabled={chatLoading}
                onClick={() => { if (!user) { navigate("/login"); return; } startChat(showroom.ownerUserId); }}
                className="flex items-center justify-center gap-1.5 flex-1 border rounded-xl px-3 py-2 text-xs font-bold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><MessageCircle className="w-3.5 h-3.5" /> مراسلة</>}
              </button>
            )}
          </>
        )}
        <ShareSheet
          options={{
            title: showroom.name,
            city: showroom.city,
            url: `${baseUrl}/showroom/${showroom.id}`,
            description: showroom.description,
          }}
          className="flex items-center justify-center gap-1.5 border rounded-xl px-3 py-2 text-xs font-bold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        />
      </div>
    </div>
  );
}

export default function ShowroomsPage() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const { data: showrooms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/showrooms"],
    queryFn: () => fetch(withApi("/api/showrooms")).then(r => r.json()),
    staleTime: 60_000,
  });

  const list = Array.isArray(showrooms) ? showrooms : [];
  const cities = [...new Set(list.map((s: any) => s.city).filter(Boolean))];

  const filtered = list.filter((s: any) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase());
    const matchCity = !cityFilter || s.city === cityFilter;
    return matchSearch && matchCity;
  });

  const featured = filtered.filter((s: any) => s.isFeatured);
  const regular = filtered.filter((s: any) => !s.isFeatured);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Gradient header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary to-primary/80 text-white px-4 pt-6 pb-5">
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">معارض السيارات</h1>
          </div>
          <p className="text-white/80 text-sm">معارض موثّقة من جميع المحافظات السورية</p>
        </div>
        <div className="absolute left-4 bottom-4 opacity-10 pointer-events-none">
          <Building2 className="w-32 h-32" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 pb-24">
        {/* Search + Filter */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن معرض..."
              className="w-full border rounded-xl pr-9 pl-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">كل المدن</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-bold">لا توجد معارض</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  المعارض المميزة
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map((s: any) => <ShowroomCard key={s.id} showroom={s} />)}
                </div>
              </div>
            )}
            {/* Regular */}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-primary" />
                    جميع المعارض
                    <span className="text-sm font-normal text-muted-foreground">({regular.length})</span>
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regular.map((s: any) => <ShowroomCard key={s.id} showroom={s} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
