import { useState, useEffect } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "marklet_app_rated";
const DELAY_MS = 2 * 60 * 1000;

export default function AppRatingPopup() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const already = localStorage.getItem(STORAGE_KEY);
    if (already) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const stars = "⭐".repeat(rating);
      await api.support.feedback({
        feedback: `${stars} (${rating}/5)${comment ? ` — ${comment}` : ""}`,
        userId: user?.id ?? null,
      });
      localStorage.setItem(STORAGE_KEY, "rated");
      setSubmitted(true);
      setTimeout(() => setOpen(false), 2000);
    } catch {
      toast({ title: "حدث خطأ", description: "لم نتمكن من إرسال تقييمك", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleDismiss}>
      <div
        className="bg-card border rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground p-1 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <>
            <div className="text-4xl mb-3">⭐</div>
            <h3 className="text-xl font-bold text-foreground mb-1">هل أعجبك MARKLET؟</h3>
            <p className="text-muted-foreground text-sm mb-5">شاركنا رأيك لنحسّن التجربة</p>

            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-125"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      star <= (hovered || rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="تعليق اختياري..."
              rows={2}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-background resize-none mb-4 focus:border-primary outline-none"
            />

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
                className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/90"
              >
                {submitting ? "جارٍ الإرسال..." : "قيّم التطبيق"}
              </Button>
              <Button variant="ghost" onClick={handleDismiss} className="rounded-xl text-muted-foreground">
                لاحقاً
              </Button>
            </div>
          </>
        ) : (
          <div className="py-4">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-foreground mb-2">شكراً على تقييمك!</h3>
            <p className="text-muted-foreground text-sm">رأيك يساعدنا على تحسين MARKLET</p>
          </div>
        )}
      </div>
    </div>
  );
}
