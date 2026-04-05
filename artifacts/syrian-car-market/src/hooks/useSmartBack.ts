import { useLocation } from "wouter";

/**
 * زر رجوع ذكي موحّد:
 * - إذا يوجد تاريخ → window.history.back()
 * - إذا لا يوجد تاريخ → انتقل للصفحة الافتراضية (fallback)
 */
export function useSmartBack(fallback = "/") {
  const [, navigate] = useLocation();

  return () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  };
}

/**
 * حفظ مصدر الانتقال قبل الذهاب لصفحة نشر إعلان،
 * حتى يعود التطبيق لنفس القسم بعد النشر.
 */
export function saveListingOrigin(path: string) {
  sessionStorage.setItem("listing_origin", path);
}

/**
 * استرداد وحذف مسار المصدر بعد النشر.
 */
export function consumeListingOrigin(): string {
  const origin = sessionStorage.getItem("listing_origin") || "/";
  sessionStorage.removeItem("listing_origin");
  return origin;
}
