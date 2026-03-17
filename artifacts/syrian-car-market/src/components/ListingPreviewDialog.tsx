import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, Loader2, ShieldCheck } from "lucide-react";

export interface PreviewListing {
  title: string;
  price?: string | number | null;
  currency?: "USD" | "SYP" | string;
  city?: string | null;
  description?: string | null;
  images?: string[];
  badges?: string[];
  meta?: { label: string; value: string }[];
}

interface ListingPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  listing: PreviewListing;
  submitting?: boolean;
}

export function ListingPreviewDialog({
  open,
  onClose,
  onConfirm,
  listing,
  submitting,
}: ListingPreviewDialogProps) {
  const { title, price, currency = "USD", city, description, images = [], badges = [], meta = [] } = listing;
  const mainImage = images[0] ?? null;

  const formatPrice = (p: string | number | null | undefined) => {
    if (!p) return null;
    const n = Number(p);
    if (isNaN(n)) return String(p);
    return currency === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} ل.س`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-primary" />
            معاينة الإعلان قبل النشر
          </DialogTitle>
        </DialogHeader>

        {/* Card preview */}
        <div className="rounded-2xl border shadow-sm overflow-hidden bg-card">
          {/* Image */}
          {mainImage ? (
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={mainImage} alt={title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
              <span className="text-4xl">🚗</span>
            </div>
          )}

          <div className="p-3 space-y-2">
            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {badges.map((b, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{b}</Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h3 className="font-bold text-foreground line-clamp-1">{title || "بدون عنوان"}</h3>

            {/* Price */}
            {price && (
              <p className="text-primary font-bold text-lg" dir="ltr">{formatPrice(price)}</p>
            )}

            {/* City */}
            {city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {city}
              </p>
            )}

            {/* Meta fields */}
            {meta.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {meta.map((m, i) => (
                  <span key={i}><span className="font-medium">{m.label}:</span> {m.value}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        {/* Pending note */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>سيُراجع إعلانك من قِبل الإدارة قبل ظهوره للعامة. عادةً ما يستغرق ذلك أقل من 24 ساعة.</span>
        </div>

        <DialogFooter className="flex-row gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={submitting}>
            تعديل
          </Button>
          <Button className="flex-1 rounded-xl font-bold" onClick={onConfirm} disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جارٍ النشر...</> : "تأكيد النشر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
