const CACHE_NAME = "tachocommand-shell-v52-transfer-indicator";
const CORE_ASSETS = ["/", "/app", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith("tachocommand-shell-") && key !== CACHE_NAME)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(api|admin)(\/|$)/.test(url.pathname)) return;
  // RSC and HTML share URLs; never mix their representations in offline storage.
  if (url.search || request.headers.get("rsc") || request.headers.get("accept")?.includes("text/x-component")) return;
  const navigation = request.mode === "navigate";
  const shell = ["/", "/app", "/sr", "/en", "/de", "/ru", "/bg", "/ro", "/hu"].includes(url.pathname);
  const asset = CORE_ASSETS.includes(url.pathname) || /\.(js|css|png|webp|svg|woff2)$/.test(url.pathname);
  if (navigation ? !shell : !asset) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && !response.headers.get("cache-control")?.includes("no-store")) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {}));
    }
    return response;
  }).catch(async () => (await caches.match(request)) ||
    (navigation ? await caches.match("/") : null) || new Response("Offline", { status: 503 })));
});
