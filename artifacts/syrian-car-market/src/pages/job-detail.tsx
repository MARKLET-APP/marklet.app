// UI_ID: JOB_DETAIL_01
// NAME: تفاصيل الوظيفة
import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getJobById } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Briefcase, ChevronRight, Phone, MessageCircle,
  Loader2, Clock, Star, Building, DollarSign, Eye, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const JOB_TYPE_LABEL: Record<string, string> = {
  "دوام كامل": "دوام كامل",
  "دوام جزئي": "دوام جزئي",
  "عن بعد": "عن بعد",
  "عقد مؤقت": "عقد مؤقت",
};

const JOB_TYPE_COLOR: Record<string, string> = {
  "دوام كامل": "bg-green-100 text-green-800",
  "دوام جزئي": "bg-blue-100 text-blue-800",
  "عن بعد": "bg-purple-100 text-purple-800",
  "عقد مؤقت": "bg-orange-100 text-orange-800",
};

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { startChat, loading: chatLoading } = useStartChat();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getJobById(id)
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Briefcase className="w-16 h-16 opacity-30" />
        <p className="text-lg">لم يتم العثور على هذا الإعلان</p>
        <Button variant="outline" onClick={() => navigate("/jobs")}>
          العودة للوظائف
        </Button>
      </div>
    );
  }

  const phone: string | null = item.phone || item.posterPhone || null;

  const handleChat = () => {
    if (!user) { navigate("/login"); return; }
    if (item.posterId) startChat(item.posterId);
  };

  const handleCall = () => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto pb-32" dir="rtl">

      {/* Back */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/jobs")} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="font-bold text-base truncate">{item.title}</span>
      </div>

      <div className="p-4 space-y-5">

        {/* Header card */}
        <div className="bg-card border rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {item.jobType && (
              <Badge className={cn("font-bold", JOB_TYPE_COLOR[item.jobType] ?? "bg-gray-100 text-gray-800")}>
                {JOB_TYPE_LABEL[item.jobType] ?? item.jobType}
              </Badge>
            )}
            {item.subCategory && (
              <Badge variant="outline">{item.subCategory}</Badge>
            )}
            {item.isFeatured && (
              <Badge className="bg-amber-100 text-amber-800">
                <Star className="w-3 h-3 mr-1" /> مميز
              </Badge>
            )}
          </div>

          <h1 className="text-xl font-bold leading-snug">{item.title}</h1>

          {item.company && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building className="w-4 h-4 shrink-0" />
              <span>{item.company}</span>
            </div>
          )}

          {(item.province || item.city) && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{[item.city, item.province].filter(Boolean).join("، ")}</span>
            </div>
          )}
        </div>

        {/* Salary */}
        {item.salary && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">الراتب</p>
              <p className="text-2xl font-bold text-primary">${Number(item.salary).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {item.field && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">المجال</p>
                <p className="font-bold text-sm">{item.field}</p>
              </div>
            </div>
          )}
          {item.experience && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">الخبرة</p>
                <p className="font-bold text-sm">{item.experience}</p>
              </div>
            </div>
          )}
          {item.viewCount > 0 && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">المشاهدات</p>
                <p className="font-bold">{item.viewCount}</p>
              </div>
            </div>
          )}
          {item.createdAt && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">تاريخ النشر</p>
                <p className="font-bold text-xs">{new Date(item.createdAt).toLocaleDateString("ar-SY")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div className="space-y-2">
            <h3 className="font-bold text-base">وصف الوظيفة</h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Requirements */}
        {item.requirements && (
          <div className="space-y-2 border rounded-xl p-4 bg-muted/30">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              المتطلبات والمؤهلات
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.requirements}</p>
          </div>
        )}

        {/* Poster */}
        {item.posterName && (
          <div className="border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {item.posterName[0]}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">صاحب الإعلان</p>
              <p className="font-bold">{item.posterName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom contact bar */}
      <div className="fixed bottom-0 right-0 left-0 z-50 lg:hidden bg-background/95 backdrop-blur-sm border-t shadow-lg px-4 py-3 flex gap-2">
        {phone ? (
          <>
            <Button
              className="flex-1 rounded-xl h-12 font-bold gap-2"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4" />
              اتصال
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12 font-bold gap-2 border-green-500 text-green-600 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </Button>
          </>
        ) : (
          <Button
            className="flex-1 rounded-xl h-12 font-bold gap-2"
            onClick={handleChat}
            disabled={chatLoading}
          >
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            تواصل مع صاحب الإعلان
          </Button>
        )}
      </div>
    </div>
  );
}
