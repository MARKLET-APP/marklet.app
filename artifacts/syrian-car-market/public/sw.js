const CACHE_NAME = "marklet-v2";
const STATIC_ASSETS = [
  "/",
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/push/")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
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
    data = { title: "MARKLET", body: event.data.text() };
  }

  const title = data.title || "MARKLET";
  const options = {
    body: data.body || "لديك إشعار جديد",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-96.png",
    tag: data.tag || "marklet-notification",
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

  // Build full absolute URL from the path
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to find an already-open window on our origin
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          // Send a message so the SPA navigates without a full page reload
          client.postMessage({ type: "SW_NAVIGATE", url: targetPath });
          return client.focus();
        }
      }
      // No open window — open a new one with the full URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
