import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * يحفظ موضع التمرير على #app-main عند مغادرة الصفحة،
 * ويستعيده تلقائياً عند العودة إليها.
 *
 * استخدمه في صفحات القوائم (العقارات، وظائف، كل شيء…)
 * حتى يعود المستخدم للمكان ذاته بعد الرجوع من صفحة تفاصيل.
 */
export function useScrollRestore(customKey?: string) {
  const [location] = useLocation();
  const key = `scroll_${customKey ?? location}`;

  useEffect(() => {
    const el = document.getElementById("app-main");
    if (!el) return;

    const saved = sessionStorage.getItem(key);
    if (saved) {
      const top = parseInt(saved, 10);
      requestAnimationFrame(() => {
        el.scrollTop = top;
      });
    } else {
      el.scrollTop = 0;
    }

    return () => {
      const elNow = document.getElementById("app-main");
      if (elNow) {
        sessionStorage.setItem(key, String(elNow.scrollTop));
      }
    };
  }, [key]);
}

/**
 * يمسح موضع التمرير المحفوظ لمسار معين.
 * استدعِه قبل navigate() للمسار حتى تبدأ الصفحة من الأعلى.
 */
export function clearScrollRestore(path: string) {
  sessionStorage.removeItem(`scroll_${path}`);
}
