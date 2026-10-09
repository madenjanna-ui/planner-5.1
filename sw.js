const CACHE_PREFIX = "madenflow-shell-";
const CACHE_VERSION = "6.5.0";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const SHELL_FILES = ["./", "./index.html", "./style.css", "./app.js", "./storage.js", "./tasks.js", "./service.js", "./visits.js", "./cloud.js", "./manifest.json", "./sw.js"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(SHELL_FILES.map(async path => {
      try {
        const response = await fetch(new Request(path, { cache: "reload" }));
        if (response.ok) await cache.put(path, response);
      } catch (_) { /* Keep installing if an optional shell file is unavailable. */ }
    }));
    // First install activates immediately so offline support is available.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "MADENFLOW_SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
