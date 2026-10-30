const PREFIX = "revchinois-";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const res = await fetch("precache.json", { cache: "reload" });
    const { version, files } = await res.json();
    const name = PREFIX + version;
    try {
      const cache = await caches.open(name);
      await Promise.all(files.map(async (f) => {
        const r = await fetch(f, { cache: "reload" });
        if (!r.ok) throw new Error("precache failed: " + f);
        await cache.put(f, r);
      }));
      // "./" maps to index.html
      const idx = await cache.match("index.html");
      if (idx) await cache.put("./", idx.clone());
    } catch (e) {
      await caches.delete(name); // never leave a half-filled cache behind
      throw e;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const res = await fetch("precache.json", { cache: "reload" }).catch(() => null);
    const keep = res && res.ok ? PREFIX + (await res.json()).version : null;
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
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === "navigate") {
        const idx = await caches.match("index.html");
        if (idx) return idx;
      }
      throw e;
    }
  })());
});
