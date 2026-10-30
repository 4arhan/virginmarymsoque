/* Service worker for Virgin Mary Mosque.
   Makes the site installable ("Add to Home Screen") and keeps the pages and
   prayer times available offline. Network first: every request goes to the
   network, so updates show straight away; the cache is only the fallback when
   the network fails. Live data (/api/…, the calendar feed) is never cached. */

const VERSION = "2026-10-30a";
const CACHE = `masjid-maryam-${VERSION}`;
const ROOT = new URL("./", self.location).pathname;

const PRECACHE = [
  "",
  "offline.html",
  "programs/prayers.html",
  "assets/css/styles.css",
  "assets/js/main.js",
  "assets/js/nav.js",
  "assets/js/a11y-toolbar.js",
  "assets/js/forms.js",
  "assets/js/prayer-times.js",
  "assets/js/prayer-core.js",
  "assets/js/times-data.js",
  "assets/js/site-config.js",
  "assets/js/install.js",
  "assets/img/icons.svg",
  "assets/img/logo.png",
  "assets/img/logo-reversed.png",
  "assets/img/favicon.svg",
  "partials/header.html",
  "partials/footer.html",
  "partials/prayer-widget.html",
].map((path) => ROOT + path);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("masjid-maryam-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts, maps, Instagram images: browser default
  if (url.pathname.startsWith(`${ROOT}api/`) || url.pathname.endsWith(".ics")) return; // live data
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (cached) return cached;
    if (req.mode === "navigate") {
      const offline = await cache.match(`${ROOT}offline.html`);
      if (offline) return offline;
    }
    throw err;
  }
}
