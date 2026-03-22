import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Share } from "@capacitor/share";

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

async function copyText(text: string): Promise<void> {
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
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  /* ── Share via system apps (Capacitor → native sheet on Android) ── */
  const handleShareApps = async () => {
    setOpen(false);
    try {
      const text = buildText(options);
      // Check if Capacitor Share is available (Android/iOS APK)
      const canShare = await Share.canShare().catch(() => ({ value: false }));
      if (canShare.value) {
        await Share.share({
          title: options.title,
          text,
          url: options.url,
          dialogTitle: "شارك الإعلان عبر التطبيقات",
        });
      } else if (navigator.share) {
        // PWA / browser Web Share API fallback
        await navigator.share({ title: options.title, text, url: options.url });
      } else {
        // Desktop: fall through to copy
        await handleCopy(false);
      }
    } catch (err: any) {
      if (err?.message?.includes("cancel") || err?.errorMessage?.includes("cancel")) return;
      if (err?.name === "AbortError") return;
      // Unexpected error — silently copy as last resort
      await handleCopy(false);
    }
  };

  /* ── Copy to clipboard ── */
  const handleCopy = async (showSheet = true) => {
    if (showSheet) setOpen(false);
    const text = buildText(options);
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "تم النسخ!", description: "تم نسخ رابط الإعلان" });
  };

  return (
    <>
      {/* Trigger */}
      <div onClick={() => setOpen(true)} className={className}>
        {trigger ?? (
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-xl hover:bg-primary/5">
            <Share2 className="w-3.5 h-3.5" />
            مشاركة
          </button>
        )}
      </div>

      {/* Backdrop + Sheet */}
      {open && (
        <div
          className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground">مشاركة الإعلان</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Share to apps */}
              <button
                onClick={handleShareApps}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-primary text-center leading-tight">
                  مشاركة مع التطبيقات
                </span>
              </button>

              {/* Copy */}
              <button
                onClick={() => handleCopy()}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-muted hover:bg-muted/80 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
                  {copied
                    ? <Check className="w-6 h-6 text-green-600" />
                    : <Copy className="w-6 h-6 text-foreground" />
                  }
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {copied ? "تم النسخ!" : "نسخ الرابط"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
