import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLookupVehicle } from "@workspace/api-client-react";
import {
  FileSearch, ShieldAlert, AlertTriangle, CheckCircle, Activity,
  Info, BadgeCheck, Bell, Gauge, CalendarClock, Wrench,
  ClipboardCheck, MessageSquareWarning, CalendarDays, ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RecallItem = {
  campaign: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  date: string;
};

export default function VehicleInfo() {
  const { register, handleSubmit } = useForm({ defaultValues: { vin: "" } });
  const lookupMutation = useLookupVehicle();
  const [, navigate] = useLocation();

  const [expandedRecall, setExpandedRecall] = useState<number | null>(null);

  const onSubmit = (data: { vin: string }) => {
    if (!data.vin) return;
    lookupMutation.mutate({ data: { vin: data.vin } });
  };

  const report = lookupMutation.data as (typeof lookupMutation.data & {
    isRealData?: boolean;
    recalls?: RecallItem[];
    riskScore?: number;
    riskLevel?: "good" | "check" | "serious";
    complaintCount?: number; // من NHTSA Complaints API — حقيقي
  }) | undefined;

  const recalls: RecallItem[] = report?.recalls ?? [];
  const riskLevel = report?.riskLevel ?? "good";
  const riskScore = report?.riskScore ?? 0;
  const complaintCount: number = report?.complaintCount ?? -1; // -1 = لم يُجلب / خطأ API
  // hasIssues يعتمد فقط على بيانات حقيقية (استدعاءات وشكاوى)
  const hasIssues = recalls.length > 0 || complaintCount > 50;

  const riskConfig = {
    good:    { label: "جيدة",                  color: "text-green-700",  bg: "bg-green-50 border-green-200",  bar: "bg-green-500" },
    check:   { label: "تحتاج فحص",             color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  bar: "bg-amber-500" },
    serious: { label: "يوصى بفحص شامل",        color: "text-red-700",    bg: "bg-red-50 border-red-200",      bar: "bg-red-500"   },
  };
  const risk = riskConfig[riskLevel];

  return (
    <div className="py-12 px-4 max-w-5xl mx-auto min-h-[80vh]">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">تقرير تاريخ المركبة</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          أدخل رقم الشاسيه (VIN) للحصول على تقرير يتضمن مواصفات المركبة، الاستدعاءات الرسمية، وعدد الشكاوى المسجلة لدى NHTSA.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto mb-16 relative">
        <div className="glass-panel p-2 rounded-2xl flex flex-col sm:flex-row gap-2 shadow-2xl">
          <div className="relative flex-1">
            <FileSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
            <input
              {...register("vin")}
              placeholder="أدخل رقم الشاسيه (VIN) هنا..."
              className="w-full h-14 bg-background/50 border-none rounded-xl pr-14 pl-4 text-lg font-mono focus:ring-2 focus:ring-primary outline-none uppercase"
            />
          </div>
          <Button type="submit" disabled={lookupMutation.isPending} className="h-14 px-8 rounded-xl font-bold text-lg shadow-lg">
            {lookupMutation.isPending ? "جاري البحث..." : "استخراج التقرير"}
          </Button>
        </div>
      </form>

      {report && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* ── Data source banner ─────────────────────────────────────────── */}
          {report.isRealData ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-center">
              <BadgeCheck className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800 mb-0.5">بيانات موثّقة</p>
                <p className="text-xs text-green-700">المواصفات مستخرجة من قاعدة بيانات الشركات المصنّعة الرسمية (NHTSA vPIC).</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-0.5">تنبيه: مواصفات تقديرية</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  لم يتم العثور على هذا الرقم في قاعدة بيانات الشركات المصنّعة. الموديل والمواصفات مستنتجة من بنية رقم VIN وقد لا تطابق سيارتك الفعلية.
                </p>
              </div>
            </div>
          )}

          {/* ── AI Summary ─────────────────────────────────────────────────── */}
          {report.aiSummary && (
            <div className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/20 p-6 rounded-2xl flex gap-4 items-start shadow-inner">
              <div className="bg-accent text-white p-3 rounded-xl shadow-md shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-accent-foreground mb-1">ملخص الذكاء الاصطناعي</h3>
                <p className="text-foreground/90 leading-relaxed font-medium">{report.aiSummary}</p>
              </div>
            </div>
          )}

          {/* ── Risk score ─────────────────────────────────────────────────── */}
          <div className={`border rounded-2xl p-5 ${risk.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge className={`w-5 h-5 ${risk.color}`} />
                <span className={`font-bold text-base ${risk.color}`}>مؤشر المخاطر</span>
              </div>
              <span className={`font-black text-lg ${risk.color}`}>{risk.label}</span>
            </div>

            {/* Score bar */}
            <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${risk.bar}`}
                style={{ width: `${Math.min(100, (riskScore / 4) * 100)}%` }}
              />
            </div>

            {/* Score breakdown pills — بيانات حقيقية فقط */}
            <div className="flex flex-wrap gap-2 text-xs">
              <ScorePill active={recalls.length > 0} label={`استدعاءات NHTSA (${recalls.length})`} icon="🔔" />
              <ScorePill active={new Date().getFullYear() - report.year > 10} label="عمر أكثر من ١٠ سنوات" icon="📅" />
              <ScorePill active={complaintCount > 50} label={complaintCount >= 0 ? `شكاوى (${complaintCount})` : "شكاوى (غير متاح)"} icon="⚠️" />
            </div>
          </div>

          {/* ── Recalls section ────────────────────────────────────────────── */}
          <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="text-primary w-5 h-5" />
                الاستدعاءات الرسمية (Recalls)
              </h3>
              {recalls.length > 0 ? (
                <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 font-bold px-3 py-1">
                  ⚠ {recalls.length} استدعاء
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 font-bold px-3 py-1">
                  <CheckCircle className="w-3 h-3" /> لا يوجد استدعاءات
                </Badge>
              )}
            </div>

            {recalls.length > 0 ? (
              <div className="divide-y">
                {recalls.map((recall, idx) => (
                  <div key={idx} className="px-6 py-4">
                    <button
                      className="w-full text-right"
                      onClick={() => setExpandedRecall(expandedRecall === idx ? null : idx)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-foreground leading-tight">{recall.component}</span>
                            {recall.campaign && (
                              <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
                                #{recall.campaign}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{recall.summary}</p>
                        </div>
                        <span className="text-muted-foreground text-sm shrink-0 mt-1">
                          {expandedRecall === idx ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {expandedRecall === idx && (
                      <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {recall.consequence && (
                          <RecallDetail icon={<ShieldAlert className="w-4 h-4 text-red-500" />} label="الخطر المحتمل" text={recall.consequence} />
                        )}
                        {recall.remedy && (
                          <RecallDetail icon={<Wrench className="w-4 h-4 text-blue-500" />} label="الإصلاح المطلوب" text={recall.remedy} />
                        )}
                        {recall.date && (
                          <RecallDetail icon={<CalendarClock className="w-4 h-4 text-muted-foreground" />} label="تاريخ الإعلان" text={recall.date} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">لا توجد استدعاءات رسمية مسجلة لهذا الطراز</p>
                <p className="text-xs text-muted-foreground/70 mt-1">البيانات من قاعدة NHTSA الأمريكية</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Condition Overview — بيانات حقيقية فقط ───────────────── */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-3xl p-6 border shadow-lg h-full flex flex-col gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="text-primary" /> حالة المركبة
                </h3>

                {/* استدعاءات NHTSA — حقيقي */}
                <div className={`flex items-center justify-between p-3 rounded-xl ${recalls.length > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <div className="flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${recalls.length > 0 ? "text-red-500" : "text-green-600"}`} />
                    <span className="text-sm font-medium">استدعاءات NHTSA</span>
                  </div>
                  <Badge className={recalls.length > 0
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-green-100 text-green-700 border-green-200"}>
                    {recalls.length > 0 ? `${recalls.length} استدعاء` : "لا يوجد"}
                  </Badge>
                </div>

                {/* شكاوى NHTSA — حقيقي */}
                <div className={`flex items-center justify-between p-3 rounded-xl ${
                  complaintCount > 50 ? "bg-amber-50" : complaintCount >= 0 ? "bg-green-50" : "bg-muted/30"
                }`}>
                  <div className="flex items-center gap-2">
                    <MessageSquareWarning className={`w-4 h-4 ${
                      complaintCount > 50 ? "text-amber-600" : complaintCount >= 0 ? "text-green-600" : "text-muted-foreground"
                    }`} />
                    <span className="text-sm font-medium">شكاوى مسجلة</span>
                  </div>
                  {complaintCount >= 0 ? (
                    <Badge className={complaintCount > 50
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-green-100 text-green-700 border-green-200"}>
                      {complaintCount} شكوى
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">تعذّر الجلب</span>
                  )}
                </div>

                {/* عمر المركبة — مشتق من البيانات الحقيقية */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">عمر المركبة</span>
                  </div>
                  <Badge variant="outline">
                    {new Date().getFullYear() - report.year} سنة
                  </Badge>
                </div>

                {/* تنبيه صريح عن بيانات الحوادث */}
                <div className="mt-auto pt-4 border-t">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <ShieldQuestion className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <span className="font-bold block mb-0.5">سجل الحوادث غير متاح مجاناً</span>
                      بيانات الحوادث والإصلاحات الكبرى تتطلب خدمات مدفوعة (Carfax, AutoCheck).
                      للتحقق الميداني، احجز فحصاً متخصصاً.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Details & Specs ────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm h-full">
                <h2 className="text-2xl font-bold mb-6 text-foreground">{report.brand} {report.model} {report.year}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <SpecBox label="بلد المنشأ"   value={report.countryOfOrigin || "غير محدد"} />
                  <SpecBox label="سعة المحرك"   value={report.engineCapacity || "غير محدد"} />
                  <SpecBox label="الأحصنة"      value={report.horsepower ? `${report.horsepower} HP` : "غير محدد"} />
                  <SpecBox label="ناقل الحركة"  value={report.transmission === "automatic" ? "أوتوماتيك" : "يدوي"} />
                </div>
              </div>
            </div>

          </div>

          {/* ── Motivational CTA ───────────────────────────────────────────── */}
          {hasIssues && (
            <div className="bg-gradient-to-br from-red-50 to-amber-50 border border-red-200 rounded-3xl p-8 text-center space-y-4 shadow-inner">
              <div className="flex justify-center">
                <div className="bg-red-100 p-4 rounded-2xl">
                  <ClipboardCheck className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-black text-red-800">تم رصد مؤشرات تستدعي فحص المركبة يدوياً</h3>
              <p className="text-red-700/80 max-w-lg mx-auto leading-relaxed">
                يمكنك حجز فحص احترافي عبر التطبيق. يقوم المفتش المعتمد بفحص الهيكل، المحرك، وجميع الأنظمة الإلكترونية وتزويدك بتقرير مفصل.
              </p>
              <Button
                onClick={() => navigate("/inspections")}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-6 text-base rounded-2xl shadow-lg gap-2"
              >
                <ClipboardCheck className="w-5 h-5" />
                احجز فحص شامل للمركبة
              </Button>
            </div>
          )}

          {/* Always-visible soft CTA (no issues) */}
          {!hasIssues && (
            <div className="border border-primary/20 bg-primary/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold text-foreground">هل تريد تأكيداً أشمل؟</p>
                <p className="text-sm text-muted-foreground">احجز فحصاً ميدانياً مع مفتش معتمد للطمأنينة التامة.</p>
              </div>
              <Button
                onClick={() => navigate("/inspections")}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 font-bold rounded-xl gap-2 shrink-0"
              >
                <ClipboardCheck className="w-4 h-4" />
                احجز فحصاً
              </Button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

function ScorePill({ active, label, icon }: { active: boolean; label: string; icon: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-medium transition-all
      ${active ? "bg-white border-red-300 text-red-700" : "bg-white/40 border-transparent text-muted-foreground opacity-50"}`}>
      {icon} {label}
    </span>
  );
}

function RecallDetail({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-bold text-foreground/70">{label}</span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
}


function SpecBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-sm bg-secondary/30 px-3 py-2 rounded-lg">{value}</p>
    </div>
  );
}
