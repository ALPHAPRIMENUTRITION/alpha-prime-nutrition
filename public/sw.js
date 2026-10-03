// Service worker de Alpha Prime Nutrition.
// Estrategia conservadora para datos privados:
//  * Las páginas (HTML) y la API SIEMPRE van a la red: nunca se guardan datos
//    de clientes en el teléfono. Sin conexión se muestra /offline.
//  * Los archivos estáticos versionados de Next (/_next/static), íconos y
//    fuentes se guardan en caché para que la app abra rápido.
const VERSION = "v6";
const STATIC_CACHE = `ap-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("ap-") && k !== STATIC_CACHE).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:woff2?|ttf)$/.test(url.pathname));

// Cada deploy trae archivos nuevos: se conservan solo los más recientes.
async function trim(cache, max = 200) {
  const keys = await cache.keys();
  const extra = keys.filter((k) => !PRECACHE.includes(new URL(k.url).pathname)).slice(0, Math.max(0, keys.length - max));
  await Promise.all(extra.map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navegación: red primero; si no hay conexión, página offline.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          return await fetch(req);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          return (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Estáticos versionados: caché primero.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          trim(cache);
        }
        return res;
      })(),
    );
  }
  // Todo lo demás (Supabase, datos, imágenes firmadas): directo a la red.
});

// ---------- Notificaciones push ----------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Alpha Prime";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { link: data.link || "/" },
      lang: "es",
      vibrate: [120, 60, 120],
    }),
  );
});

// Al tocar el aviso: abre la app en la pantalla indicada (reusa la ventana si ya está abierta).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  const target = new URL(link, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(target.href).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
