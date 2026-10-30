const PREFIX = "revchinois-";
let currentCache = null;
async function cacheName() {
  if (currentCache) return currentCache;
  const ks = (await caches.keys()).filter((k) => k.startsWith(PREFIX));
  return ks[ks.length - 1] || PREFIX; // newest by creation order
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const res = await fetch("precache.json", { cache: "reload" });
    const { version, files } = await res.json();
    currentCache = PREFIX + version;
    const cache = await caches.open(currentCache);
    await Promise.all(files.map(async (f) => {
      const r = await fetch(f, { cache: "reload" });
      if (!r.ok) throw new Error("precache failed: " + f);
      await cache.put(f, r);
    }));
    // "./" maps to index.html
    const idx = await cache.match("index.html");
    if (idx) await cache.put("./", idx.clone());
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const res = await fetch("precache.json", { cache: "reload" }).catch(() => null);
    const keep = res && res.ok ? PREFIX + (await res.json()).version : null;
    if (keep) currentCache = keep;
    if (!keep) { await self.clients.claim(); return; } // offline: never delete caches blindly
    for (const k of await caches.keys()) {
      if (k.startsWith(PREFIX) && k !== keep) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(await cacheName());
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === "navigate") {
        const idx = await cache.match("index.html");
        if (idx) return idx;
      }
      throw e;
    }
  })());
});
