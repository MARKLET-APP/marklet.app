/**
 * ShareSheet — one-tap share button
 *
 * Uses navigator.share() which works natively in:
 *   • Android WebView (APK) — opens native Android share sheet
 *   • Android / iOS Chrome & Safari — opens native share sheet
 *   • Desktop browsers — NOT supported → clipboard fallback
 */
import React from "react";
import { Share2 } from "lucide-react";
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
  /** When provided, rendered inside a wrapper div instead of a default button. */
  trigger?: React.ReactNode;
  /** Extra className for the wrapper (useful when trigger is provided). */
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

async function clipboardWrite(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
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

  /** Synchronous handler — MUST stay sync up to navigator.share()
   *  so the browser's transient activation (user-gesture) remains valid. */
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();

    const text = buildText(options);
    const shareData: ShareData = { title: options.title || "MARKLET", text, url: options.url };

    if (navigator.share) {
      // Works in Android WebView (APK), Android Chrome, iOS Safari, Samsung Internet
      navigator.share(shareData).catch((err: Error) => {
        if (err.name !== "AbortError") {
          void clipboardWrite(text);
          toast({ title: "تم نسخ الرابط" });
        }
      });
    } else {
      // Desktop browsers: clipboard fallback
      void clipboardWrite(text).then(() => {
        toast({ title: "تم نسخ الرابط", description: "الصق الرابط في واتساب أو تيليغرام" });
      });
    }
  }

  /* When a custom trigger is provided, clone it and inject onClick directly
     onto the element — this preserves the browser's "transient activation"
     (user-gesture) so navigator.share() works in Android WebView. */
  if (trigger) {
    return React.cloneElement(trigger as React.ReactElement<any>, {
      onClick: handleClick,
      className: [
        (trigger as React.ReactElement<any>).props?.className ?? "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    });
  }

  /* Default: a compact pill button */
  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1 h-6 px-2.5 text-[10px] font-medium text-muted-foreground border border-border/70 rounded-full hover:bg-muted/70 active:scale-95 transition-all whitespace-nowrap shrink-0"
      }
    >
      <Share2 className="w-2.5 h-2.5 shrink-0" />
      مشاركة
    </button>
  );
}
