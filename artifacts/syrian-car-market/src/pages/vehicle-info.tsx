import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLookupVehicle } from "@workspace/api-client-react";
import { FileSearch, ShieldAlert, AlertTriangle, CheckCircle, Activity, History, Info, X, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function VehicleInfo() {
  const { register, handleSubmit } = useForm({ defaultValues: { vin: "" } });
  const lookupMutation = useLookupVehicle();

  const [showNotes, setShowNotes] = useState(false);
  const [notesContent, setNotesContent] = useState("");

  const openNotes = (text: string) => {
    setNotesContent(text);
    setShowNotes(true);
  };

  const closeNotes = () => setShowNotes(false);

  const onSubmit = (data: { vin: string }) => {
    if (!data.vin) return;
    lookupMutation.mutate({ data: { vin: data.vin } });
  };

  const report = lookupMutation.data;

  return (
    <div className="py-12 px-4 max-w-5xl mx-auto min-h-[80vh]">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">تقرير تاريخ المركبة</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          أدخل رقم الشاسيه (VIN) للحصول على تقرير مفصل يتضمن الحوادث السابقة، قراءات العداد، وتاريخ الصيانة للحفاظ على استثمارك.
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

          {/* Data source banner */}
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

          {/* AI Summary Banner */}
          {report.aiSummary && (
            <div className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/20 p-6 rounded-2xl flex gap-4 items-start shadow-inner">
              <div className="bg-accent text-white p-3 rounded-xl shadow-md shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-accent-foreground mb-1">ملخص الذكاء الاصطناعي لحالة المركبة</h3>
                <p className="text-foreground/90 leading-relaxed font-medium">{report.aiSummary}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Condition Overview */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-3xl p-6 border shadow-lg h-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Activity className="text-primary" /> حالة المركبة
                </h3>
                
                <div className="space-y-4">
                  <ConditionRow
                    label="حالة الهيكل"
                    isGood={!report.hasStructuralDamage}
                    notes="تم رصد ضرر هيكلي في سجلات المركبة. يُنصح بفحص شاصي السيارة لدى متخصص قبل الشراء."
                    onNotesClick={openNotes}
                  />
                  <ConditionRow
                    label="إصلاحات كبرى"
                    isGood={!report.hasMajorRepairs}
                    notes="سُجِّلت إصلاحات كبرى على المركبة. تحقق من طبيعة هذه الإصلاحات ومدى تأثيرها على قيمتها."
                    onNotesClick={openNotes}
                  />
                  <ConditionRow
                    label="نظام الوسائد الهوائية (Airbags)"
                    isGood={!report.airbagDeployed}
                    notes="تم تفعيل الوسائد الهوائية في حادثة سابقة. تأكد من استبدالها بشكل صحيح وإعادة برمجة النظام."
                    onNotesClick={openNotes}
                  />
                  
                  <div className="pt-6 mt-6 border-t">
                    <p className="text-sm text-muted-foreground mb-2">تقييم الأضرار العام</p>
                    {report.damageStatus === 'clean' && (
                      <div className="bg-green-100 text-green-800 border border-green-200 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2">
                        <CheckCircle className="w-8 h-8" />
                        سجل نظيف وممتاز
                      </div>
                    )}
                    {report.damageStatus === 'minor' && (
                      <div className="bg-yellow-100 text-yellow-800 border border-yellow-200 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2">
                        <AlertTriangle className="w-8 h-8" />
                        أضرار طفيفة مسجلة
                      </div>
                    )}
                    {report.damageStatus === 'serious' && (
                      <div className="bg-red-100 text-red-800 border border-red-200 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2">
                        <ShieldAlert className="w-8 h-8" />
                        حوادث جسيمة مسجلة
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Details & Specs */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Basic Specs */}
              <div className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-foreground">{report.brand} {report.model} {report.year}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <SpecBox label="بلد المنشأ" value={report.countryOfOrigin || 'غير محدد'} />
                  <SpecBox label="سعة المحرك" value={report.engineCapacity || 'غير محدد'} />
                  <SpecBox label="الأحصنة" value={report.horsepower ? `${report.horsepower} HP` : 'غير محدد'} />
                  <SpecBox label="ناقل الحركة" value={report.transmission === 'automatic' ? 'أوتوماتيك' : 'يدوي'} />
                </div>
              </div>

              {/* History Timeline */}
              <div className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <History className="text-primary" /> تسلسل قراءات العداد (المسافة)
                </h3>
                
                <div className="relative pl-4 space-y-8 border-r-2 border-primary/20 mr-4">
                  {report.mileageHistory.map((record, idx) => (
                    <div key={idx} className="relative pr-8">
                      <div className="absolute top-1 -right-[9px] w-4 h-4 rounded-full bg-primary ring-4 ring-card" />
                      <div className="bg-secondary/30 p-4 rounded-2xl inline-block min-w-[200px]">
                        <p className="font-bold text-foreground text-lg">{record.year}</p>
                        <p className="text-muted-foreground font-mono mt-1">{record.mileage.toLocaleString('ar-EG')} كم</p>
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
        </div>
      )}

      {/* Notes Modal */}
      {showNotes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeNotes}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeNotes}
              className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors"
            >
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

function ConditionRow({
  label,
  isGood,
  notes,
  onNotesClick,
}: {
  label: string;
  isGood: boolean;
  notes: string;
  onNotesClick: (text: string) => void;
}) {
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

function SpecBox({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-sm bg-secondary/30 px-3 py-2 rounded-lg">{value}</p>
    </div>
  );
}
