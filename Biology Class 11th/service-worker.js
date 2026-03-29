/**
 * Service Worker for Class 11 Biology PWA
 * Author: Mateen Yousuf – School Education Department, J&K
 * Strategy: Cache-first for app shell, network-first for fresh content
 */

const CACHE_NAME = 'bio11-jkbose-v1';
const OFFLINE_PAGE = './index.html';

// Files to cache on install (app shell)
const APP_SHELL = [
  './index.html',
  './manifest.json'
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing Biology App cache…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating – cleaning old caches…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())  // take control of all pages
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (e.g. Google Fonts if ever added)
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Serve from cache; also update cache in background (stale-while-revalidate)
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache =>
                cache.put(event.request, networkResponse.clone())
              );
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);  // if network fails, cached copy is fine

        return cachedResponse;  // return cached immediately
      }

      // Not in cache – try network, then cache the response
      return fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, responseToCache)
          );
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback – serve the main app shell
          return caches.match(OFFLINE_PAGE);
        });
    })
  );
});

// ── Background Sync (optional) ─────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    console.log('[SW] Background sync triggered for scores');
    // No remote backend needed – scores are in localStorage
  }
});

// ── Push Notifications (optional) ─────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Biology App';
  const options = {
    body: data.body || 'New content available!',
    icon: './manifest.json',
    badge: './manifest.json'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

console.log('[SW] Service Worker script loaded – JKBOSE Bio11 by Mateen Yousuf');
