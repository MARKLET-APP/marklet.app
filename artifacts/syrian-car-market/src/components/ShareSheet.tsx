// UI_ID: COMP_SHARE_SHEET_01
// NAME: ورقة المشاركة
/**
 * ShareSheet — one-tap share button
 *
 * Priority:
 *   1. window.AndroidNative.share() — native Android Intent (APK / Capacitor WebView)
 *   2. navigator.share()            — Web Share API (mobile browsers)
 *   3. clipboard fallback           — desktop browsers
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

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();

    const text = buildText(options);
    const title = options.title || "MARKLET";

    /* ── 1. Native Android bridge (Capacitor APK) ─────────────────── */
    const native = (window as any).AndroidNative;
    if (typeof native?.share === "function") {
      native.share(text, title);
      return;
    }

    /* ── 2. Web Share API (mobile Chrome / Safari) ────────────────── */
    if (navigator.share) {
      navigator
        .share({ title, text, url: options.url })
        .catch((err: Error) => {
          if (err.name !== "AbortError") {
            void clipboardWrite(text);
            toast({ title: "تم نسخ الرابط" });
          }
        });
      return;
    }

    /* ── 3. Desktop fallback: clipboard ───────────────────────────── */
    void clipboardWrite(text).then(() => {
      toast({
        title: "تم نسخ الرابط",
        description: "الصق الرابط في واتساب أو تيليغرام",
      });
    });
  }

  /* When a custom trigger is provided, clone it and inject onClick directly. */
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
