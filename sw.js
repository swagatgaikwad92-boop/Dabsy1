/* ============================================================
   D.A.B.S.y — sw.js
   Offline shell. Every path is relative to this file's own scope
   so this works whether hosted at the domain root or under a
   GitHub Pages project path (username.github.io/repo/).
   ============================================================ */

const CACHE_VERSION = "dabsy-v1";
const SCOPE = self.registration.scope; // e.g. https://user.github.io/repo/

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./core.css",
  "./face.css",
  "./animations.css",
  "./panels.css",
  "./projection.css",
  "./emotion-engine.js",
  "./memory-engine.js",
  "./face-engine.js",
  "./interaction-engine.js",
  "./voice-engine.js",
  "./vision-engine.js",
  "./ai-engine.js",
  "./pet-engine.js",
  "./projection-engine.js",
  "./study-engine.js",
  "./utility-engine.js",
  "./entertainment-engine.js",
  "./pwa-engine.js",
  "./app.js",
  "./boot.js",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      const urls = SHELL_FILES.map((f) => new URL(f, SCOPE).toString());
      return cache.addAll(urls);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Network-first for the Gemini API itself (never cache those calls).
  if (event.request.url.includes("generativelanguage.googleapis.com")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
