// Cache PWA : changer ce nom force les navigateurs a prendre la derniere version.
const CACHE_NAME = "redemption-v65";
const APP_SHELL = [
  "/",
  "/index.html",
  "/product.html",
  "/wave-payment.html",
  "/payment-success.html",
  "/style.css",
  "/script.js",
  "/manifest.webmanifest",
  "/img/logo.jpg",
  "/img/IMg backgound.jpeg"
];

// Installation : precharge les fichiers essentiels pour une ouverture rapide.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activation : supprime les anciens caches et prend le controle des pages ouvertes.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Strategie reseau : HTML en network-first, CSS/JS/images en cache-first.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "/index.html"));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/.netlify/functions/")) {
      event.respondWith(fetch(event.request));
      return;
    }
    if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") {
      event.respondWith(fetch(event.request));
      return;
    }
    if (/\.html$/i.test(url.pathname)) {
      event.respondWith(networkFirst(event.request));
      return;
    }
    if (/\.(?:css|js)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(event.request));
      return;
    }
    event.respondWith(cacheFirst(event.request));
  }
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error();
  }
}

async function cacheFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fallback = fallbackUrl ? await cache.match(fallbackUrl) : null;

  const networkUpdate = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fallback || networkUpdate || Response.error();
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const payload = event.data.payload || {};
    self.registration.showNotification(payload.title || "House of Redemption", {
      body: payload.body || "Nouvelle mise a jour disponible.",
      icon: payload.icon || "/img/logo.jpg",
      badge: payload.badge || "/img/logo.jpg",
      tag: payload.tag || "redemption-update",
      data: payload.data || { url: "/" },
      vibrate: [120, 80, 120]
    });
  }
});

// Reçoit les push envoyés depuis le serveur (web-push VAPID).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "House of Redemption";
  const options = {
    body: data.body || "Nouvelle mise à jour disponible.",
    icon: data.icon || "/img/logo.jpg",
    badge: "/img/logo.jpg",
    tag: data.tag || "redemption-push",
    data: { url: data.url || "/" },
    vibrate: [120, 80, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Renouvelle l'abonnement push si le navigateur l'expire.
self.addEventListener("pushsubscriptionchange", (event) => {
  const VAPID_PUBLIC_KEY = "BC0_hV2-coQl7HMa4rB6I8U8zObPz12IZIkmtE9jLwaf8T5l8uwK0jA0SV8qc_ViDPckbaDZRGv8Q2JjKkFeUvU";
  function urlB64ToUint8Array(b64) {
    const pad = "=".repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    }).then((sub) => {
      const { endpoint, keys } = sub.toJSON();
      return fetch("/.netlify/functions/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "push_subscriptions", payload: { endpoint, p256dh: keys.p256dh, auth: keys.auth } }),
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
