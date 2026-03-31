import { Router } from "express";
import { db, carsTable, imagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const BOT_UA = /whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|googlebot|bingbot|discordbot|applebot|pinterest/i;

router.get("/og/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  // Build absolute origin from the incoming request
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const origin = `${proto}://${host}`;

  const fallbackImage = `${origin}/icons/icon-512.png`;
  const listingUrl = `${origin}/listing/${id}`;

  try {
    const [car] = await db
      .select({
        id: carsTable.id,
        brand: carsTable.brand,
        model: carsTable.model,
        year: carsTable.year,
        price: carsTable.price,
        city: carsTable.city,
        description: carsTable.description,
      })
      .from(carsTable)
      .where(eq(carsTable.id, id))
      .limit(1);

    if (!car) {
      res.redirect(302, listingUrl);
      return;
    }

    const images = await db
      .select({ url: imagesTable.imageUrl })
      .from(imagesTable)
      .where(eq(imagesTable.carId, id))
      .limit(1);

    // Convert relative /api/... path to absolute URL
    const rawImage = images[0]?.url ?? "";
    const carImage = rawImage.startsWith("http")
      ? rawImage
      : rawImage
      ? `${origin}${rawImage}`
      : fallbackImage;

    const titleParts = [car.brand, car.model, car.year].filter(Boolean).join(" ");
    const priceStr = car.price ? ` — $${Number(car.price).toLocaleString()}` : "";
    const cityStr = car.city ? ` | ${car.city}` : "";
    const ogTitle = `${titleParts}${priceStr}${cityStr} — LAZEMNI`;
    const ogDesc = car.description
      ? car.description.slice(0, 160)
      : "السوق الذكي للسيارات والخدمات في سورية — بيع . تأجير . قطع غيار . خردة";

    const ua = req.headers["user-agent"] ?? "";
    const isBot = BOT_UA.test(ua);

    const esc = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${esc(ogTitle)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="LAZEMNI" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDesc)}" />
  <meta property="og:image" content="${esc(carImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${esc(listingUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDesc)}" />
  <meta name="twitter:image" content="${esc(carImage)}" />
  ${isBot ? "" : `<meta http-equiv="refresh" content="0;url=${esc(listingUrl)}" />`}
</head>
<body style="font-family:sans-serif;text-align:center;margin-top:40px;">
  <p>جارٍ التحويل... <a href="${esc(listingUrl)}">انقر هنا لعرض الإعلان</a></p>
  ${isBot ? "" : `<script>window.location.replace("${listingUrl}");</script>`}
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.status(200).send(html);
  } catch {
    res.redirect(302, listingUrl);
  }
});

export default router;
