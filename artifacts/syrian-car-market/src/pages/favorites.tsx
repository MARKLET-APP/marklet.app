// UI_ID: FAVORITES_01
// NAME: المفضلة
import { useAuthStore } from "@/lib/auth";
import { imgUrl } from "@/lib/runtimeConfig";
import { Loader2, Bookmark, MapPin, Trash2, Car, Bike, Wrench, Package, Hash } from "lucide-react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SaveType =
  | "car_sale"
  | "car_rent"
  | "car_parts"
  | "junk"
  | "plate_numbers"
  | "motorcycles"
  | "buy_request"
  | "rent_request";

interface SavedItem {
  id: number;
  listingType: SaveType;
  listingId: number;
  createdAt: string;
  data: {
    id: number;
    title: string;
    price: number | null;
    city: string | null;
    images?: string[] | null;
    sellerName?: string | null;
  };
}

const TYPE_LABELS: Record<SaveType, string> = {
  car_sale: "سيارة للبيع",
  motorcycles: "دراجة نارية",
  car_rent: "للإيجار",
  car_parts: "قطعة غيار",
  junk: "خردة / معطوبة",
  plate_numbers: "لوحة مرور",
  buy_request: "طلب شراء",
  rent_request: "طلب استئجار",
};

const TYPE_COLORS: Record<SaveType, string> = {
  car_sale: "bg-green-100 text-green-700",
  motorcycles: "bg-rose-100 text-rose-700",
  car_rent: "bg-blue-100 text-blue-700",
  car_parts: "bg-orange-100 text-orange-700",
  junk: "bg-slate-100 text-slate-700",
  plate_numbers: "bg-amber-100 text-amber-700",
  buy_request: "bg-purple-100 text-purple-700",
  rent_request: "bg-cyan-100 text-cyan-700",
};

const TYPE_ICONS: Record<SaveType, JSX.Element> = {
  car_sale: <Car className="w-8 h-8" />,
  motorcycles: <Bike className="w-8 h-8" />,
  car_rent: <Car className="w-8 h-8" />,
  car_parts: <Wrench className="w-8 h-8" />,
  junk: <Package className="w-8 h-8" />,
  plate_numbers: <Hash className="w-8 h-8" />,
  buy_request: <Package className="w-8 h-8" />,
  rent_request: <Package className="w-8 h-8" />,
};

const TYPE_LINKS: Record<SaveType, (id: number) => string> = {
  car_sale: (id) => `/cars/${id}`,
  motorcycles: (_id) => `/buy-requests`,
  car_rent: (_id) => `/rental-cars`,
  car_parts: (_id) => `/car-parts`,
  junk: (_id) => `/junk-cars`,
  plate_numbers: (_id) => `/plates`,
  buy_request: (_id) => `/buy-requests`,
  rent_request: (_id) => `/rental-cars`,
};

export default function Favorites() {
  const { user, isHydrated } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: saved = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ["saves"],
    queryFn: () => apiRequest("/api/saves"),
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) =>
      apiRequest(`/api/saves/${type}/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saves"] });
      toast({ title: "تم الحذف", description: "تم حذف الإعلان من المحفوظات" });
    },
  });

  if (!isHydrated) return (
    <div className="p-8 flex justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto w-full min-h-[60vh]" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Bookmark className="w-6 h-6 fill-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">المحفوظات</h1>
          <p className="text-muted-foreground mt-1">الإعلانات التي حفظتها</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border border-dashed shadow-sm">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">لا توجد محفوظات</h3>
          <p className="text-muted-foreground max-w-md mb-6">احفظ الإعلانات التي تعجبك لتجدها هنا لاحقاً</p>
          <Link href="/search">
            <Button className="rounded-xl">تصفح الإعلانات</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {saved.map((item) => {
            const img = item.data.images?.[0] ?? null;
            const link = TYPE_LINKS[item.listingType](item.listingId);
            return (
              <div key={item.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <Link href={link}>
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {img ? (
                      <img src={imgUrl(img)} alt={item.data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        {TYPE_ICONS[item.listingType]}
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className={cn("border-0 text-xs font-bold", TYPE_COLORS[item.listingType])}>
                        {TYPE_LABELS[item.listingType]}
                      </Badge>
                    </div>
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={link}>
                    <h3 className="font-bold text-base leading-snug mb-2 hover:text-primary transition-colors line-clamp-2">
                      {item.data.title}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between">
                    <div>
                      {item.data.price != null && (
                        <p className="text-lg font-extrabold text-primary" dir="ltr">
                          ${Number(item.data.price).toLocaleString()}
                        </p>
                      )}
                      {item.data.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{item.data.city}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeMutation.mutate({ type: item.listingType, id: item.listingId })}
                      disabled={removeMutation.isPending}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="حذف من المحفوظات"
                    >
                      {removeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
