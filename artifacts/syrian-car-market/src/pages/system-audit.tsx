import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Redirect } from "wouter";
import {
  CheckCircle2, XCircle, Loader2, Server, Database, Shield,
  ShoppingBag, Share2, Smartphone, FileJson, Zap, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AuditResult {
  status: "READY" | "NOT_READY" | "ERROR";
  ready_for_mobile: boolean;
  timestamp: string;
  checks: Record<string, boolean>;
  counts: Record<string, number>;
  errors?: Record<string, string>;
}

const CHECK_META: Record<string, { label: string; icon: React.ReactNode; critical: boolean }> = {
  server:          { label: "الخادم يعمل",               icon: <Server className="w-4 h-4" />,      critical: true },
  database:        { label: "قاعدة البيانات متصلة",      icon: <Database className="w-4 h-4" />,    critical: true },
  auth:            { label: "نظام المصادقة (JWT)",        icon: <Shield className="w-4 h-4" />,      critical: true },
  listings_cars:   { label: "إعلانات السيارات",           icon: <ShoppingBag className="w-4 h-4" />, critical: true },
  listings_parts:  { label: "إعلانات قطع الغيار",         icon: <ShoppingBag className="w-4 h-4" />, critical: false },
  listings_junk:   { label: "إعلانات الخردة",             icon: <ShoppingBag className="w-4 h-4" />, critical: false },
  listings_rental: { label: "إعلانات الإيجار",            icon: <ShoppingBag className="w-4 h-4" />, critical: false },
  saves:           { label: "نظام الحفظ / المحفوظات",    icon: <Database className="w-4 h-4" />,    critical: false },
  routes:          { label: "API Routes مسجّلة",          icon: <Zap className="w-4 h-4" />,         critical: true },
  share:           { label: "نظام المشاركة (Web Share)",  icon: <Share2 className="w-4 h-4" />,      critical: false },
  pwa_manifest:    { label: "ملف manifest.json",          icon: <FileJson className="w-4 h-4" />,    critical: true },
  pwa_sw:          { label: "Service Worker (sw.js)",     icon: <Smartphone className="w-4 h-4" />,  critical: true },
  pwa:             { label: "PWA جاهز للتثبيت",           icon: <Smartphone className="w-4 h-4" />,  critical: true },
};

function CheckRow({ name, value, meta }: { name: string; value: boolean; meta: typeof CHECK_META[string] }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${value ? "bg-green-50 border-green-100" : meta.critical ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
      <div className="flex items-center gap-3">
        <span className={value ? "text-green-600" : meta.critical ? "text-red-500" : "text-amber-500"}>
          {meta.icon}
        </span>
        <span className="font-medium text-sm">{meta.label}</span>
        {meta.critical && !value && (
          <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">أساسي</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {value ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive" />
        )}
        <span className={`text-xs font-bold ${value ? "text-green-600" : meta.critical ? "text-red-600" : "text-amber-600"}`}>
          {value ? "✓ جاهز" : "✗ غير جاهز"}
        </span>
      </div>
    </div>
  );
}

export default function SystemAudit() {
  const { user } = useAuthStore();
  if (user?.role !== "admin") return <Redirect to="/" />;

  const { data, isLoading, refetch, isFetching } = useQuery<AuditResult>({
    queryKey: ["system-audit"],
    queryFn: () => apiRequest("/api/admin/system-audit"),
    staleTime: 0,
    retry: false,
  });

  const isReady = data?.ready_for_mobile;
  const totalChecks = Object.keys(data?.checks ?? {}).length;
  const passedChecks = Object.values(data?.checks ?? {}).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl font-black text-primary tracking-tight">MARKLET</span>
          </div>
          <h1 className="text-2xl font-bold">تدقيق النظام الداخلي</h1>
          <p className="text-muted-foreground text-sm">فحص شامل للتحقق من جاهزية التطبيق قبل التحويل للأندرويد</p>
          {data?.timestamp && (
            <p className="text-xs text-muted-foreground" dir="ltr">
              آخر فحص: {new Date(data.timestamp).toLocaleString("ar-SY")}
            </p>
          )}
        </div>

        {/* Status Banner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">جاري فحص النظام...</p>
          </div>
        ) : data ? (
          <>
            <div className={`rounded-2xl p-6 text-center border-2 ${isReady ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
              <div className="text-5xl mb-3">{isReady ? "✅" : "⚠️"}</div>
              <h2 className={`text-2xl font-black mb-1 ${isReady ? "text-green-700" : "text-red-700"}`}>
                {isReady ? "MARKLET جاهز للتحويل للأندرويد" : "النظام غير جاهز بعد"}
              </h2>
              <p className={`text-sm font-medium ${isReady ? "text-green-600" : "text-red-600"}`}>
                {passedChecks} من {totalChecks} فحوصات ناجحة
              </p>
              <div className="mt-3 bg-white/50 rounded-xl p-2">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isReady ? "bg-green-500" : "bg-amber-500"}`}
                    style={{ width: `${(passedChecks / totalChecks) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                  {Math.round((passedChecks / totalChecks) * 100)}% complete
                </p>
              </div>
            </div>

            {/* Counts */}
            {data.counts && Object.keys(data.counts).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(data.counts).map(([key, val]) => (
                  <div key={key} className="bg-card border rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-primary" dir="ltr">{val.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {{ cars: "سيارة", car_parts: "قطعة غيار", junk_cars: "سيارة خردة", rental_cars: "سيارة إيجار", saved: "محفوظ", routes: "API Route" }[key] ?? key}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Checks List */}
            <div className="space-y-2">
              <h3 className="font-bold text-base px-1">نتائج الفحص التفصيلية</h3>
              {Object.entries(data.checks).map(([name, value]) => {
                const meta = CHECK_META[name] ?? { label: name, icon: <Zap className="w-4 h-4" />, critical: false };
                return <CheckRow key={name} name={name} value={Boolean(value)} meta={meta} />;
              })}
            </div>

            {/* Errors */}
            {data.errors && Object.keys(data.errors).length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-destructive text-sm">أخطاء مكتشفة</h3>
                {Object.entries(data.errors).map(([k, v]) => (
                  <p key={k} className="text-xs font-mono text-destructive" dir="ltr">[{k}] {v}</p>
                ))}
              </div>
            )}

            {/* Final verdict */}
            <div className={`rounded-2xl p-5 border text-sm space-y-1 ${isReady ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
              <p className="font-bold text-base">{isReady ? "📱 جاهز للتحويل للأندرويد" : "🔧 يلزم إصلاح النقاط المحددة أعلاه"}</p>
              {isReady && (
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>الخادم والقاعدة يعملان بشكل مستقر</li>
                  <li>جميع أنواع الإعلانات متاحة</li>
                  <li>نظام المصادقة يعمل</li>
                  <li>ملفات PWA جاهزة للتثبيت على الموبايل</li>
                  <li>النظام يدعم WebView لأندرويد / Capacitor / TWA</li>
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-destructive">فشل تحميل نتائج الفحص</div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex-1 gap-2 rounded-xl"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            إعادة الفحص
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => window.open("/api/admin/system-audit", "_blank")}
          >
            <FileJson className="w-4 h-4" />
            JSON خام
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          هذه الأداة للمسؤولين فقط — لا تعدّل على منطق النظام الحالي
        </p>
      </div>
    </div>
  );
}
