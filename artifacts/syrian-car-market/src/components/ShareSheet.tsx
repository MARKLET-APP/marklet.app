import { Share2 } from "lucide-react";
import { Share } from "@capacitor/share";
import { useToast } from "@/hooks/use-toast";

interface ShareOptions {
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

function buildText(options: ShareOptions): string {
  const { title, price, city, url, description } = options;
  const priceStr = price ? `السعر: $${Number(price).toLocaleString()}` : "";
  return [
    title,
    priceStr,
    city ? `الموقع: ${city}` : "",
    description ? description.slice(0, 120) : "",
    `\nشاهد الإعلان:\n${url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyFallback(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0";
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

    try {
      // ── Capacitor (Android/iOS APK) ────────────────────────────────────────
      // Opens the native system share sheet which already includes copy option.
      await Share.share({
        title: options.title || "شارك الإعلان",
        text,
        url: options.url,
        dialogTitle: "شارك الإعلان عبر التطبيقات",
      });
      return;
    } catch (err: any) {
      // User dismissed the share sheet → do nothing
      const msg = err?.message ?? err?.errorMessage ?? "";
      if (
        err?.name === "AbortError" ||
        msg.includes("cancel") ||
        msg.includes("dismiss") ||
        msg.includes("Share canceled")
      ) {
        return;
      }
      // Capacitor not available (running in browser) → try Web Share API
    }

    try {
      // ── Web Share API (PWA / mobile browser) ───────────────────────────────
      if (navigator.share) {
        await navigator.share({ title: options.title, text, url: options.url });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }

    // ── Clipboard fallback (desktop browser) ───────────────────────────────
    await copyFallback(text);
    toast({ title: "تم النسخ!", description: "تم نسخ رابط الإعلان" });
  };

  return (
    <div onClick={handleShare} className={className}>
      {trigger ?? (
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-xl hover:bg-primary/5">
          <Share2 className="w-3.5 h-3.5" />
          مشاركة
        </button>
      )}
    </div>
  );
}
