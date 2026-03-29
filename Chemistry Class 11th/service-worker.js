/**
 * Service Worker for JKBOSE Class 11 Chemistry App
 * Author: Mateen Yousuf, Teacher, School Education Department J&K
 * Version: 1.0.0
 *
 * Handles:
 * - Pre-caching all app assets on install
 * - Serving cached assets when offline (Cache First strategy)
 * - Updating cache when new version is deployed
 */

// ─── Cache Configuration ───────────────────────────────────────────────────
const CACHE_NAME = 'chem11-jkbose-v1';
const DYNAMIC_CACHE = 'chem11-dynamic-v1';

// All files to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './author.jpg',
  // Google Fonts (cached for offline use after first load)
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap'
];

// ─── Install Event: Pre-cache app shell ────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker v1...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching app shell assets...');
        // Cache each asset individually so one failure doesn't break everything
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Could not cache: ${url}`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] App shell cached. Skipping waiting...');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ─── Activate Event: Clean old caches ──────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating new Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker active. Claiming clients...');
        return self.clients.claim(); // Control all open tabs immediately
      })
  );
});

// ─── Fetch Event: Cache-First Strategy ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, etc.)
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // ✅ Cache HIT: return cached version immediately
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // ❌ Cache MISS: fetch from network and cache dynamically
        console.log('[SW] Fetching from network:', request.url);
        return fetch(request)
          .then(networkResponse => {
            // Only cache valid responses
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Don't cache opaque responses from cross-origin (except fonts)
            if (networkResponse.type === 'opaque' && !url.hostname.includes('fonts')) {
              return networkResponse;
            }

            // Clone response (it can only be consumed once)
            const responseToCache = networkResponse.clone();

            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
                console.log('[SW] Dynamically cached:', request.url);
              });

            return networkResponse;
          })
          .catch(err => {
            console.warn('[SW] Network request failed. Serving offline fallback.', err);

            // Return offline fallback for HTML navigation requests
            if (request.destination === 'document') {
              return caches.match('./index.html');
            }

            // For images, return a simple SVG placeholder
            if (request.destination === 'image') {
              return new Response(
                `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#0d1635"/>
                  <text x="50" y="55" text-anchor="middle" fill="#00d4ff" font-size="12">Offline</text>
                </svg>`,
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }

            // Return empty response for other failed requests
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
  );
});

// ─── Background Sync (future feature placeholder) ──────────────────────────
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  // Reserved for future sync of quiz scores to server
});

// ─── Push Notifications (future feature placeholder) ───────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Chemistry Reminder', {
    body: data.body || 'Time to study!',
    icon: './author.jpg',
    badge: './author.jpg',
    tag: 'chem11-notification'
  });
});

console.log('[SW] Service Worker script loaded for JKBOSE Class 11 Chemistry App');
