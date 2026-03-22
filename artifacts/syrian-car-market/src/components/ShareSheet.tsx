/**
 * ShareSheet
 * ----------
 * On native Android/iOS (Capacitor APK):
 *   → opens the system share sheet via @capacitor/share
 * On mobile browser / PWA (supports Web Share API):
 *   → opens the browser's native share dialog via navigator.share
 * On desktop browser (no share support):
 *   → copies link to clipboard with a toast notification
 *
 * The user is NEVER shown a custom intermediate UI — the native dialog opens directly.
 */

import { Share2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { useToast } from "@/hooks/use-toast";

export interface ShareOptions {
  title: string;
  price?: string | number | null;
  city?: string | null;
  url: string;
  description?: string | null;
}

interface ShareSheetProps {
  options: ShareOptions;
  trigger?: React.ReactNode;
  className?: string;
}

function buildText(o: ShareOptions): string {
  return [
    o.title,
    o.price ? `السعر: $${Number(o.price).toLocaleString()}` : "",
    o.city ? `الموقع: ${o.city}` : "",
    o.description ? o.description.slice(0, 120) : "",
    `\nشاهد الإعلان:\n${o.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function isCancelError(err: any): boolean {
  const msg: string = (err?.message ?? err?.errorMessage ?? "").toLowerCase();
  return (
    err?.name === "AbortError" ||
    msg.includes("cancel") ||
    msg.includes("dismiss") ||
    msg.includes("abort") ||
    msg.includes("share canceled")
  );
}

async function clipboardCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = Object.assign(document.createElement("textarea"), {
      value: text,
    });
    el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export function ShareSheet({ options, trigger, className }: ShareSheetProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const text = buildText(options);
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // ── Native Android / iOS ─────────────────────────────────────────────
      try {
        await Share.share({
          title: options.title || "شارك الإعلان",
          text,
          url: options.url,
          dialogTitle: "شارك الإعلان عبر التطبيقات",
        });
      } catch (err) {
        if (!isCancelError(err)) {
          console.error("[Share] native share failed:", err);
        }
      }
      return;
    }

    // ── Web / PWA ────────────────────────────────────────────────────────
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: options.title || "شارك الإعلان",
          text,
          url: options.url,
        });
        return;
      } catch (err) {
        if (isCancelError(err)) return;
        // API exists but failed — fall through to clipboard
      }
    }

    // ── Desktop / unsupported — clipboard fallback ───────────────────────
    await clipboardCopy(text);
    toast({ title: "تم نسخ الرابط", description: "شاركه على واتساب أو أي تطبيق آخر" });
  };

  return (
    <div onClick={handleShare} className={className}>
      {trigger ?? (
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-xl hover:bg-primary/5 whitespace-nowrap">
          <Share2 className="w-3.5 h-3.5 shrink-0" />
          مشاركة
        </button>
      )}
    </div>
  );
}
