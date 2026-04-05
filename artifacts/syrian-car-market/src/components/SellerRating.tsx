// مكوّن تقييم صاحب الإعلان — يُستخدم في جميع صفحات التفاصيل
// التقييم للشخص/البائع وليس للإعلان نفسه
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Review = {
  id: number;
  reviewerId: number;
  reviewedUserId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerPhoto: string | null;
};

const RATING_LABELS = ["", "سيئ", "مقبول", "جيد", "جيد جداً", "ممتاز"];

function StarRow({
  count, hovered, selected, onHover, onLeave, onSelect,
}: {
  count?: number; hovered: number; selected: number;
  onHover: (n: number) => void; onLeave: () => void; onSelect: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => onHover(n)}
          onMouseLeave={onLeave}
          onClick={() => onSelect(n)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(
              "w-9 h-9 transition-colors",
              n <= (hovered || selected)
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/25",
            )}
          />
        </button>
      ))}
    </div>
  );
}

interface SellerRatingProps {
  /** ID صاحب الإعلان */
  sellerId: number;
  /** هل المستخدم الحالي هو صاحب الإعلان */
  isOwner: boolean;
  className?: string;
}

export default function SellerRating({ sellerId, isOwner, className }: SellerRatingProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["seller-reviews", sellerId],
    queryFn: () => apiRequest<Review[]>(`/api/reviews/user/${sellerId}`),
    enabled: sellerId > 0,
    staleTime: 30_000,
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length
      : 0;

  const alreadyReviewed = user
    ? reviews.some((r) => r.reviewerId === user.id)
    : false;

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/reviews", "POST", {
        reviewedUserId: sellerId,
        rating: selected,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      toast({ title: "تم إرسال تقييمك ✅" });
      setShowForm(false);
      setSelected(0);
      setHovered(0);
      setComment("");
      qc.invalidateQueries({ queryKey: ["seller-reviews", sellerId] });
    },
    onError: () =>
      toast({ title: "فشل إرسال التقييم", variant: "destructive" }),
  });

  if (isLoading) return null;

  const displayed = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className={cn("bg-card rounded-3xl border shadow-sm p-5 mb-6", className)}>
      {/* ── رأس القسم مع متوسط التقييم ── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          تقييم صاحب الإعلان
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-bold text-amber-500 text-sm">{avgRating.toFixed(1)}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "w-3.5 h-3.5",
                    n <= Math.round(avgRating)
                      ? "text-amber-400 fill-amber-400"
                      : "text-muted-foreground/25",
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* ── قائمة التقييمات (مرئية للجميع) ── */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3 mb-3">
          لا توجد تقييمات بعد — كن أول من يقيّم هذا البائع!
        </p>
      ) : (
        <div className="space-y-2.5 mb-4">
          {displayed.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 p-3 bg-muted/30 rounded-2xl"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {r.reviewerName?.[0] ?? "؟"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold">{r.reviewerName}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "w-3 h-3",
                          n <= Number(r.rating)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {RATING_LABELS[Math.round(Number(r.rating))]}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
                )}
              </div>
            </div>
          ))}
          {reviews.length > 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-xs text-primary font-medium py-1.5 hover:underline"
            >
              عرض كل التقييمات ({reviews.length})
            </button>
          )}
        </div>
      )}

      {/* ── زر / نموذج التقييم ── */}
      {isOwner ? null : !user ? (
        /* زائر غير مسجّل: يرى التقييمات لكن لا يستطيع الإرسال */
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2"
          onClick={() => navigate("/auth")}
        >
          <Star className="w-4 h-4 text-amber-400" />
          سجّل دخولك لتقييم صاحب الإعلان
        </Button>
      ) : alreadyReviewed ? (
        <p className="text-center text-sm text-muted-foreground pt-1">
          ✅ لقد قيّمت هذا البائع مسبقاً
        </p>
      ) : !showForm ? (
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2"
          onClick={() => setShowForm(true)}
        >
          <MessageSquare className="w-4 h-4" />
          أضف تقييمك لهذا البائع
        </Button>
      ) : (
        <div className="space-y-3 pt-1">
          <StarRow
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onLeave={() => setHovered(0)}
            onSelect={setSelected}
          />
          {selected > 0 && (
            <p className="text-center text-sm font-semibold text-amber-600">
              {RATING_LABELS[selected]}
            </p>
          )}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="أضف تعليقاً (اختياري)..."
            className="rounded-xl resize-none text-sm"
            rows={2}
            dir="rtl"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl"
              onClick={() => {
                setShowForm(false);
                setSelected(0);
                setHovered(0);
                setComment("");
              }}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
              disabled={selected === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "إرسال التقييم"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
