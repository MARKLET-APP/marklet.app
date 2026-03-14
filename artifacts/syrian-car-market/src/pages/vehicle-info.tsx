import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useLookupVehicle } from "@workspace/api-client-react";
import {
  FileSearch, ShieldAlert, AlertTriangle, CheckCircle, Activity,
  History, Info, X, BadgeCheck, Bell, Gauge, CalendarClock, Wrench,
  ClipboardCheck,
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

  const [showNotes, setShowNotes] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [expandedRecall, setExpandedRecall] = useState<number | null>(null);

  const openNotes = (text: string) => { setNotesContent(text); setShowNotes(true); };
  const closeNotes = () => setShowNotes(false);

  const onSubmit = (data: { vin: string }) => {
    if (!data.vin) return;
    lookupMutation.mutate({ data: { vin: data.vin } });
  };

  const report = lookupMutation.data as (typeof lookupMutation.data & {
    isRealData?: boolean;
    recalls?: RecallItem[];
    riskScore?: number;
    riskLevel?: "good" | "check" | "serious";
  }) | undefined;

  const recalls: RecallItem[] = report?.recalls ?? [];
  const riskLevel = report?.riskLevel ?? "good";
  const riskScore = report?.riskScore ?? 0;
  const hasIssues = recalls.length > 0 || report?.hasStructuralDamage || report?.hasMajorRepairs;

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
          أدخل رقم الشاسيه (VIN) للحصول على تقرير مفصل يتضمن الحوادث السابقة، قراءات العداد، والاستدعاءات الرسمية.
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

            {/* Score breakdown pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <ScorePill active={recalls.length > 0} label={`استدعاءات (${recalls.length})`} icon="🔔" />
              <ScorePill active={new Date().getFullYear() - report.year > 10} label="عمر أكثر من ١٠ سنوات" icon="📅" />
              <ScorePill active={!!(report.hasMajorRepairs || report.hasStructuralDamage)} label="حوادث مسجلة" icon="⚠️" />
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

            {/* ── Condition Overview ─────────────────────────────────────── */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-3xl p-6 border shadow-lg h-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Activity className="text-primary" /> حالة المركبة
                </h3>
                <div className="space-y-4">
                  <ConditionRow label="حالة الهيكل" isGood={!report.hasStructuralDamage}
                    notes="تم رصد ضرر هيكلي في سجلات المركبة. يُنصح بفحص شاصي السيارة لدى متخصص قبل الشراء."
                    onNotesClick={openNotes} />
                  <ConditionRow label="إصلاحات كبرى" isGood={!report.hasMajorRepairs}
                    notes="سُجِّلت إصلاحات كبرى على المركبة. تحقق من طبيعة هذه الإصلاحات ومدى تأثيرها على قيمتها."
                    onNotesClick={openNotes} />
                  <ConditionRow label="نظام الوسائد الهوائية (Airbags)" isGood={!report.airbagDeployed}
                    notes="تم تفعيل الوسائد الهوائية في حادثة سابقة. تأكد من استبدالها بشكل صحيح وإعادة برمجة النظام."
                    onNotesClick={openNotes} />

                  <div className="pt-6 mt-6 border-t">
                    <p className="text-sm text-muted-foreground mb-2">تقييم الأضرار العام</p>
                    {report.damageStatus === "clean" && (
                      <div className="bg-green-100 text-green-800 border border-green-200 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2">
                        <CheckCircle className="w-8 h-8" /> سجل نظيف وممتاز
                      </div>
                    )}
                    {report.damageStatus === "minor" && (
                      <div className="bg-yellow-100 text-yellow-800 border border-yellow-200 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2">
                        <AlertTriangle className="w-8 h-8" /> أضرار طفيفة مسجلة
                      </div>
                    )}
                    {report.damageStatus === "serious" && (
                      <div className="bg-red-100 text-red-800 border border-red-200 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2">
                        <ShieldAlert className="w-8 h-8" /> حوادث جسيمة مسجلة
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Details & Specs ────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-8">

              <div className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-foreground">{report.brand} {report.model} {report.year}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <SpecBox label="بلد المنشأ" value={report.countryOfOrigin || "غير محدد"} />
                  <SpecBox label="سعة المحرك" value={report.engineCapacity || "غير محدد"} />
                  <SpecBox label="الأحصنة" value={report.horsepower ? `${report.horsepower} HP` : "غير محدد"} />
                  <SpecBox label="ناقل الحركة" value={report.transmission === "automatic" ? "أوتوماتيك" : "يدوي"} />
                </div>
              </div>

              <div className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <History className="text-primary" /> تسلسل قراءات العداد
                </h3>
                <div className="relative pl-4 space-y-8 border-r-2 border-primary/20 mr-4">
                  {report.mileageHistory.map((record, idx) => (
                    <div key={idx} className="relative pr-8">
                      <div className="absolute top-1 -right-[9px] w-4 h-4 rounded-full bg-primary ring-4 ring-card" />
                      <div className="bg-secondary/30 p-4 rounded-2xl inline-block min-w-[200px]">
                        <p className="font-bold text-foreground text-lg">{record.year}</p>
                        <p className="text-muted-foreground font-mono mt-1">{record.mileage.toLocaleString("ar-EG")} كم</p>
                      </div>
                    </div>
                  ))}
                  {report.mileageHistory.length === 0 && (
                    <p className="text-muted-foreground pr-4">لا توجد سجلات سابقة للمسافة المقطوعة.</p>
                  )}
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

      {/* ── Notes Modal ──────────────────────────────────────────────────── */}
      {showNotes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeNotes}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={closeNotes} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">تفاصيل الملاحظات</h3>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-6">{notesContent}</p>
            <Button onClick={closeNotes} className="w-full rounded-xl">إغلاق</Button>
          </div>
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

function ConditionRow({
  label, isGood, notes, onNotesClick,
}: { label: string; isGood: boolean; notes: string; onNotesClick: (text: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
      <span className="font-medium text-sm text-foreground">{label}</span>
      {isGood ? (
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1 pr-2">
          <CheckCircle className="w-3 h-3" /> سليم
        </Badge>
      ) : (
        <button
          onClick={() => onNotesClick(notes)}
          className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
        >
          <AlertTriangle className="w-3 h-3" /> يوجد ملاحظات
        </button>
      )}
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
