const CACHE_NAME = "lazemni-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// هل الطلب navigation (تحميل صفحة HTML)؟
function isNavigationRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // لا نتدخل في طلبات API
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/push/")) return;

  // لطلبات التنقل (صفحات HTML): network-first مع fallback إلى index.html المحفوظ
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // إذا رجعت نتيجة جيدة، احفظها في الكاش
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              // احفظ index.html دائماً للاستخدام كـ fallback
              if (url.pathname === "/" || url.pathname === "/index.html") {
                cache.put("/index.html", response.clone());
              }
            });
          }
          return response;
        })
        .catch(async () => {
          // الخادم غير متاح — ارجع إلى index.html المحفوظ
          const cached = await caches.match("/index.html") ||
                         await caches.match("/") ||
                         await caches.match(event.request);
          return cached || new Response("App offline", { status: 503 });
        })
    );
    return;
  }

  // للأصول الأخرى (JS، CSS، صور): network-first مع cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─────────────────────────────────────────────────────────
// تحديث فوري عند طلب main.tsx
// ─────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─────────────────────────────────────────────────────────
// Push Notifications
// ─────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "LAZEMNI", body: event.data.text() };
  }

  const title = data.title || "LAZEMNI";
  const options = {
    body: data.body || "لديك إشعار جديد",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-96.png",
    tag: data.tag || "lazemni-notification",
    renotify: true,
    data: {
      url: data.url || "/messages",
      timestamp: Date.now(),
    },
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || "/";

  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          client.postMessage({ type: "SW_NAVIGATE", url: targetPath });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
