import { useAuthStore } from "@/lib/auth";
import { useGetFavorites } from "@workspace/api-client-react";
import { CarCard } from "@/components/CarCard";
import { Heart, Loader2 } from "lucide-react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function Favorites() {
  const { user, isHydrated } = useAuthStore();
  const { t } = useLanguage();

  const { data: favorites, isLoading } = useGetFavorites({
    query: { enabled: !!user }
  });

  if (!isHydrated) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto w-full min-h-[60vh]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Heart className="w-6 h-6 fill-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("favorites.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("profile.myFavorites")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : !favorites || favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border border-dashed shadow-sm">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">{t("favorites.empty")}</h3>
          <p className="text-muted-foreground max-w-md mb-6">{t("favorites.browse")}</p>
          <Link href="/search">
            <Button className="rounded-xl">{t("common.search")}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
