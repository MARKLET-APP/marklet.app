// UI_ID: JOB_DETAIL_01
// NAME: تفاصيل الوظيفة
import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getJobById, apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { useSaves } from "@/hooks/use-saves";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContactButtons } from "@/components/ContactButtons";
import AppRatingPopup from "@/components/AppRatingPopup";
import { ShareSheet } from "@/components/ShareSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Briefcase, ChevronRight, Loader2, Clock, Star,
  Building, DollarSign, Eye, Calendar, MessageCircle,
  Crown, Lock, Share2, ThumbsUp, Heart, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const JOB_TYPE_COLOR: Record<string, string> = {
  "دوام كامل": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "دوام جزئي": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "عن بعد": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "عقد مؤقت": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-secondary/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
      <div className="text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="font-bold text-foreground text-sm">{value}</p>
    </div>
  );
}

function RatingCard({ listingId }: { listingId: number }) {
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const labels = ["", "سيئ", "مقبول", "جيد", "جيد جداً", "ممتاز"];
  if (submitted) {
    return (
      <div className="bg-card rounded-3xl border shadow-sm p-5 mb-6 flex flex-col items-center gap-2">
        <ThumbsUp className="w-8 h-8 text-amber-400" />
        <p className="font-bold text-base">شكراً على تقييمك!</p>
        <p className="text-xs text-muted-foreground">تقييمك: {labels[selected]} ({selected}/5)</p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-3xl border shadow-sm p-5 mb-6">
      <h3 className="font-bold text-base mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" /> قيّم هذا الإعلان
      </h3>
      <div className="flex items-center gap-2 justify-center mb-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setSelected(n)} className="transition-transform hover:scale-110">
            <Star
              className={cn("w-8 h-8 transition-colors", n <= selected ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40")}
            />
          </button>
        ))}
      </div>
      {selected > 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-amber-600">{labels[selected]}</p>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white px-6" onClick={() => setSubmitted(true)}>
            إرسال التقييم
          </Button>
        </div>
      )}
    </div>
  );
}

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { startChat, loading: chatLoading } = useStartChat();
  const { isSaved, toggleSave } = useSaves();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const deleteJobMutation = useMutation({
    mutationFn: () => apiRequest(`/api/jobs/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان بنجاح" });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      navigate("/jobs");
    },
    onError: () => toast({ title: "فشل حذف الإعلان", variant: "destructive" }),
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getJobById(id)
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!item) return;
    document.title = `${item.title || "وظيفة"} | LAZEMNI`;
    return () => { document.title = "LAZEMNI"; };
  }, [item]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-32 text-muted-foreground">
        <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="font-bold text-xl text-destructive">لم يتم العثور على هذا الإعلان.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/jobs")}>العودة للوظائف</Button>
      </div>
    );
  }

  const phone: string | null = item.phone || item.posterPhone || null;
  const isPoster = !!user && item.posterId === user.id;
  const isPremium = !!(user as any)?.subscriptionActive || !!(user as any)?.isFeaturedSeller;
  const isAdmin = (user as any)?.role === "admin";

  const shareOptions = {
    title: item.title,
    price: item.salary ? `$${item.salary}` : null,
    city: [item.city, item.province].filter(Boolean).join("، ") || null,
    url: `https://marklet.net/jobs/${id}`,
    description: item.description || null,
  };

  const handleChat = () => {
    if (!user) { navigate("/login"); return; }
    if (item.posterId) {
      startChat(item.posterId, `مرحباً، أنا مهتم بإعلان الوظيفة "${item.title}". هل ما زال متاحاً؟`);
      const alreadyRated = localStorage.getItem("app_rated");
      if (!alreadyRated) setTimeout(() => setShowRatingPopup(true), 1500);
    }
  };

  const handlePhoneClick = () => {
    if (!user) { navigate("/login"); return; }
    if (!isPremium && !isAdmin) {
      toast({ title: "هذه الميزة للمشتركين فقط", description: "اشترك في LAZEMNI للوصول لأرقام هواتف أصحاب العمل." });
      return;
    }
    setShowPhone(true);
  };

  return (
    <>
      {showRatingPopup && <AppRatingPopup forceOpen onClose={() => setShowRatingPopup(false)} />}

      <div className="py-6 px-4 max-w-2xl mx-auto pb-28" dir="rtl">

        {/* ── Back bar ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/jobs")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="font-bold text-base truncate flex-1">{item.title}</span>
        </div>

        {/* ── Header card ── */}
        <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {item.jobType && (
                  <Badge className={cn("font-bold text-xs", JOB_TYPE_COLOR[item.jobType] ?? "bg-gray-100 text-gray-800")}>
                    {item.jobType}
                  </Badge>
                )}
                {item.subCategory && (
                  <Badge variant="outline" className="text-xs">{item.subCategory}</Badge>
                )}
                {item.isFeatured && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                    <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" /> مميز
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-black text-foreground leading-snug">{item.title}</h1>
              {item.company && (
                <div className="flex items-center gap-2 text-muted-foreground mt-2">
                  <Building className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{item.company}</span>
                </div>
              )}
              {(item.province || item.city) && (
                <div className="flex items-center gap-2 text-muted-foreground mt-1.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{[item.city, item.province].filter(Boolean).join("، ")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t pt-4">
            <ShareSheet
              options={shareOptions}
              trigger={
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/5">
                  <Share2 className="w-4 h-4" /> مشاركة
                </button>
              }
            />
            {user && !isPoster && (
              <button
                onClick={() => toggleSave("job", id)}
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-xl",
                  isSaved("job", id)
                    ? "text-rose-500 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                )}
              >
                <Heart className={cn("w-4 h-4", isSaved("job", id) && "fill-rose-500 text-rose-500")} />
                {isSaved("job", id) ? "محفوظ" : "حفظ"}
              </button>
            )}
            {(item.viewCount ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {item.viewCount} مشاهدة
              </span>
            )}
          </div>
        </div>

        {/* ── Salary ── */}
        {item.salary && (
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 mb-6 flex items-center gap-4">
            <DollarSign className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">الراتب المعروض</p>
              <p className="text-2xl font-black text-primary">{item.salary}</p>
            </div>
          </div>
        )}

        {/* ── Specs grid ── */}
        {(item.field || item.experience || item.viewCount > 0 || item.createdAt) && (
          <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">تفاصيل الوظيفة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {item.field && <SpecItem icon={<Briefcase className="w-5 h-5" />} label="المجال" value={item.field} />}
              {item.experience && <SpecItem icon={<Star className="w-5 h-5" />} label="الخبرة المطلوبة" value={item.experience} />}
              {(item.province || item.city) && <SpecItem icon={<MapPin className="w-5 h-5" />} label="الموقع" value={[item.city, item.province].filter(Boolean).join("، ")} />}
              {item.jobType && <SpecItem icon={<Clock className="w-5 h-5" />} label="نوع الدوام" value={item.jobType} />}
              {(item.viewCount ?? 0) > 0 && <SpecItem icon={<Eye className="w-5 h-5" />} label="المشاهدات" value={String(item.viewCount)} />}
              {item.createdAt && <SpecItem icon={<Calendar className="w-5 h-5" />} label="تاريخ النشر" value={new Date(item.createdAt).toLocaleDateString("ar-SY")} />}
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {item.description && (
          <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">وصف الوظيفة</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* ── Requirements ── */}
        {item.requirements && (
          <div className="bg-card rounded-3xl border shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> المتطلبات والمؤهلات
            </h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.requirements}</p>
          </div>
        )}

        {/* ── Rating placeholder ── */}
        <RatingCard listingId={id} />

        {/* ── Contact card (visitors only) ── */}
        {!isPoster && (
          <div className="bg-card p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-lg mb-5 border-b pb-4">معلومات صاحب الإعلان</h3>

            {item.posterName && (
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-xl shrink-0">
                  {item.posterName[0]}
                </div>
                <div>
                  <p className="font-bold text-base">{item.posterName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ناشر الإعلان</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Phone reveal block */}
              {!showPhone ? (
                <div className="space-y-2">
                  {!user ? (
                    <Button
                      onClick={() => navigate("/login")}
                      className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-primary text-primary-foreground shadow-lg"
                    >
                      <Eye className="w-5 h-5" /> سجّل دخولك لعرض الهاتف
                    </Button>
                  ) : (isPremium || isAdmin) ? (
                    phone ? (
                      <Button
                        onClick={handlePhoneClick}
                        className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-primary text-primary-foreground shadow-lg"
                      >
                        <Eye className="w-5 h-5" /> عرض رقم الهاتف
                      </Button>
                    ) : null
                  ) : (
                    <div className="space-y-2">
                      <div className="w-full rounded-xl border-2 border-muted bg-muted/30 px-4 h-12 flex items-center gap-3 overflow-hidden">
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-lg tracking-widest text-muted-foreground blur-sm select-none">+963 XX XXX XXXX</span>
                      </div>
                      <Button
                        onClick={() => toast({ title: "الاشتراك قريباً", description: "ميزة الاشتراك المدفوع ستكون متاحة قريباً!" })}
                        className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <Crown className="w-5 h-5" /> اشترك للوصول للأرقام
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 px-4 h-12 flex items-center">
                    <span dir="ltr" className="font-bold text-lg text-foreground font-mono tracking-wider">{phone}</span>
                  </div>
                  <ContactButtons
                    phone={phone}
                    sellerId={item.posterId}
                    listingId={id}
                    listingTitle={item.title}
                    size="lg"
                  />
                </div>
              )}

              {/* In-app chat — always available */}
              <Button
                onClick={handleChat}
                disabled={chatLoading}
                variant="outline"
                className="w-full rounded-xl h-12 text-base font-bold gap-2 border-2 border-primary/30 hover:bg-primary/5 hover:border-primary text-primary transition-all"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                {chatLoading ? "جارٍ الفتح..." : "بدء محادثة آمنة"}
              </Button>
            </div>

            <div className="mt-5 pt-5 border-t text-sm text-muted-foreground text-center">
              رقم الإعلان: #{id} <br />
              تاريخ النشر: {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-EG") : "—"}
            </div>
          </div>
        )}

        {/* ── Poster panel ── */}
        {isPoster && (
          <div className="bg-card p-5 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-base border-b pb-3 mb-4">إجراءات الناشر</h3>
            {!deleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full rounded-xl gap-2"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" /> حذف الإعلان
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع.</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl gap-2"
                    onClick={() => deleteJobMutation.mutate()}
                    disabled={deleteJobMutation.isPending}
                  >
                    {deleteJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    نعم، احذف
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleteJobMutation.isPending}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
