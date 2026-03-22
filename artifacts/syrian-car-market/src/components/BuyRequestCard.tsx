import { MessageCircle, Trash2, Loader2, MapPin, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareSheet } from "@/components/ShareSheet";

export type BuyRequestData = {
  id: number;
  userId: number;
  brand?: string | null;
  model?: string | null;
  maxPrice?: number | null;
  currency?: string | null;
  city?: string | null;
  description?: string | null;
  userName?: string | null;
  [key: string]: any;
};

interface BuyRequestCardProps {
  data: BuyRequestData;
  currentUserId?: number;
  accentColor?: string;
  label?: string;
  onChat?: () => void;
  chatLoading?: boolean;
  onDelete?: () => void;
  deleteLoading?: boolean;
}

export function BuyRequestCard({
  data,
  currentUserId,
  accentColor = "emerald",
  label = "طلب شراء",
  onChat,
  chatLoading,
  onDelete,
  deleteLoading,
}: BuyRequestCardProps) {
  const isOwner = currentUserId === data.userId;
  const canChat = !!onChat && currentUserId && !isOwner;

  const title =
    [data.brand, data.model, data.year].filter(Boolean).join(" ") ||
    data.type ||
    "طلب شراء";

  const colorMap: Record<string, { badge: string; price: string; btn: string }> = {
    emerald: {
      badge: "border-emerald-300 text-emerald-700 bg-emerald-50",
      price: "text-emerald-700",
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    violet: {
      badge: "border-violet-300 text-violet-700 bg-violet-50",
      price: "text-violet-700",
      btn: "bg-violet-600 hover:bg-violet-700 text-white",
    },
    slate: {
      badge: "border-slate-400 text-slate-700 bg-slate-100",
      price: "text-slate-700",
      btn: "bg-slate-600 hover:bg-slate-700 text-white",
    },
    orange: {
      badge: "border-orange-300 text-orange-700 bg-orange-50",
      price: "text-orange-700",
      btn: "bg-orange-600 hover:bg-orange-700 text-white",
    },
    amber: {
      badge: "border-amber-400 text-amber-700 bg-amber-50",
      price: "text-amber-700",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
    },
  };

  const colors = colorMap[accentColor] ?? colorMap.emerald;

  return (
    <div className="tap-card bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground shrink-0" />
          <h3 className="font-bold text-foreground">{title}</h3>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${colors.badge}`}>
          {label}
        </Badge>
      </div>

      {data.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {data.maxPrice && (
          <span className={`font-bold text-sm ${colors.price}`} dir="ltr">
            حتى ${Number(data.maxPrice).toLocaleString()}
          </span>
        )}
        {data.city && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.city}
          </span>
        )}
        {data.userName && (
          <span className="text-muted-foreground/70">الطالب: {data.userName}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
        {canChat && (
          <button
            onClick={onChat}
            disabled={chatLoading}
            className={`inline-flex items-center gap-1 h-6 px-2.5 text-[10px] font-bold rounded-full active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap ${colors.btn}`}
          >
            {chatLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <MessageCircle className="w-2.5 h-2.5" />}
            مراسلة
          </button>
        )}
        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            disabled={deleteLoading}
            className="inline-flex items-center gap-1 h-6 px-2.5 text-[10px] font-medium text-destructive border border-destructive/30 rounded-full hover:bg-destructive/10 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {deleteLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
            حذف
          </button>
        )}
        <ShareSheet
          options={{
            title,
            price: data.maxPrice,
            city: data.city,
            url: `${window.location.origin}/buy-requests`,
            description: data.description,
          }}
        />
      </div>
    </div>
  );
}
