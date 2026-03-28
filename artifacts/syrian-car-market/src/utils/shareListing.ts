export interface ShareOptions {
  title: string;
  price?: string | number | null;
  city?: string | null;
  url: string;
  description?: string | null;
}

export async function shareListing(
  options: ShareOptions,
  onCopied?: () => void
): Promise<void> {
  const { title, price, city, url, description } = options;

  const priceStr = price ? `$${Number(price).toLocaleString()}` : "";

  const text = [
    title,
    priceStr ? `السعر: ${priceStr}` : "",
    city ? `الموقع: ${city}` : "",
    description ? description.slice(0, 120) : "",
    `\nشاهد الإعلان:\n${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err: any) {
      // AbortError = user dismissed the share sheet — do NOT fall back to copy
      if (err?.name === "AbortError" || err?.message?.includes("cancel")) return;
      // Any other error (unsupported, permission denied) → fall through to copy
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    onCopied?.();
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    onCopied?.();
  }
}

export function getListingUrl(type: "car" | "part" | "rental" | "junk" | "moto" | "plate" | "buy-request", id: number): string {
  const base = window.location.origin;
  // For car listings, use /og/:id so WhatsApp/Telegram show the car image in the preview
  if (type === "car" || type === "moto") return `${base}/og/${id}`;
  return `${base}/listing/${id}`;
}
