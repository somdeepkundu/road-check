/* Road Check service worker. Shell cached on install; pages network-first (4 s), tiles kept up to TILE_MAX.
   Bump VERSION when any cached file changes; keep equal to app.js APP.version. */
const VERSION = 'road-check-1.0.0';
const TILE_CACHE = 'road-check-tiles';
const TILE_MAX = 3000;
const SHELL = ['./', './index.html', './app.js', './data.js', './style.css', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/layers.png', './vendor/leaflet/images/layers-2x.png',
  './fonts/hind-siliguri-bengali-500-normal.woff2', './fonts/hind-siliguri-bengali-600-normal.woff2', './fonts/hind-siliguri-bengali-700-normal.woff2',
  './fonts/hind-siliguri-latin-500-normal.woff2', './fonts/hind-siliguri-latin-600-normal.woff2', './fonts/hind-siliguri-latin-700-normal.woff2',
  './fonts/noto-serif-bengali-bengali-800-normal.woff2', './fonts/noto-serif-bengali-latin-800-normal.woff2'];
const TILE_HOSTS = /(^|\.)tile\.openstreetmap\.org$/;
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== TILE_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try { const res = await timeout(fetch(req), 4000); if (res && res.ok) cache.put(req, res.clone()); return res; }
  catch (e) { return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error(); }
}
async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true }); if (hit) return hit;
  const res = await fetch(req); if (res && res.ok) { const c = await caches.open(VERSION); c.put(req, res.clone()); } return res;
}
let trimming = false;
async function trimTiles() {
  if (trimming) return; trimming = true;
  try { const c = await caches.open(TILE_CACHE), ks = await c.keys(); for (let i = 0; i < ks.length - TILE_MAX; i++) await c.delete(ks[i]); } finally { trimming = false; }
}
async function tile(req) {
  const c = await caches.open(TILE_CACHE), hit = await c.match(req); if (hit) return hit;
  try { const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).then(trimTiles); return res; }
  catch (e) { return Response.error(); }
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (TILE_HOSTS.test(url.hostname)) { e.respondWith(tile(req)); return; }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || req.destination === 'document') e.respondWith(networkFirst(req)); else e.respondWith(cacheFirst(req));
});
