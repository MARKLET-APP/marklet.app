// UI_ID: VEHICLE_INFO_01
// NAME: معلومات المركبة
import { VehicleReportWidget } from "@/components/VehicleReportWidget";

export default function VehicleInfo() {
  return (
    <div className="py-12 px-4 max-w-5xl mx-auto min-h-[80vh]">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">تقرير تاريخ المركبة</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          أدخل رقم الشاسيه (VIN) للحصول على تقرير يتضمن مواصفات المركبة، الاستدعاءات الرسمية، وعدد الشكاوى المسجلة لدى NHTSA.
        </p>
      </div>
      <VehicleReportWidget />
    </div>
  );
}
