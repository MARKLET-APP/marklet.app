/**
 * ShareSheet — one-tap native share
 *
 * @capacitor/share handles all environments automatically:
 *   • Android/iOS APK  → native system share sheet
 *   • Mobile browser   → navigator.share (Chrome / Samsung Browser)
 *   • Desktop browser  → throws "not available" → clipboard fallback
 */
import { Share2 } from "lucide-react";
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
    o.description ? o.description.slice(0, 100) : "",
    `\nشاهد الإعلان:\n${o.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function isUserCancel(err: unknown): boolean {
  const msg = ((err as any)?.message ?? (err as any)?.errorMessage ?? "").toLowerCase();
  return (
    (err as any)?.name === "AbortError" ||
    msg.includes("cancel") ||
    msg.includes("dismiss") ||
    msg.includes("abort")
  );
}

async function clipboardWrite(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* execCommand fallback */
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export function ShareSheet({ options, trigger, className }: ShareSheetProps) {
  const { toast } = useToast();

  /** Called on button tap — must stay synchronous up to the first await
   *  so the browser's transient activation (user-gesture requirement)
   *  is still valid when Share.share() / navigator.share() is invoked. */
  const onTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    doShare();
  };

  async function doShare() {
    const text = buildText(options);
    try {
      // Works on Android APK (native sheet), Android Chrome (system share),
      // and iOS PWA. @capacitor/share routes internally to the right API.
      await Share.share({
        title: options.title || "MARKLET — إعلان",
        text,
        url: options.url,
        dialogTitle: "شارك الإعلان عبر",
      });
    } catch (err: unknown) {
      if (isUserCancel(err)) return; // user closed the sheet — do nothing

      // Share API not available (desktop browser) → copy as fallback
      await clipboardWrite(text);
      toast({
        title: "تم نسخ الرابط",
        description: "المشاركة المباشرة غير متاحة في هذا المتصفح — تم نسخ الرابط",
      });
    }
  }

  return (
    <div onClick={onTap} className={className} style={{ display: "contents" }}>
      {trigger ?? (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/40 rounded-lg px-2 py-1 transition-all active:scale-95 whitespace-nowrap"
        >
          <Share2 className="w-3 h-3 shrink-0" />
          مشاركة
        </button>
      )}
    </div>
  );
}
