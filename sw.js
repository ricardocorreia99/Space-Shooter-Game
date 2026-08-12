// Service Worker for Retro Space Shooter PWA
const CACHE_NAME = 'space-shooter-v5';
const BASE_PATH = '/Space-Shooter-Game/';
const ASSETS_TO_CACHE = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'game.js',
    BASE_PATH + 'manifest.json',
    BASE_PATH + 'icons/icon-72.svg',
    BASE_PATH + 'icons/icon-96.svg',
    BASE_PATH + 'icons/icon-128.svg',
    BASE_PATH + 'icons/icon-144.svg',
    BASE_PATH + 'icons/icon-152.svg',
    BASE_PATH + 'icons/icon-192.svg',
    BASE_PATH + 'icons/icon-384.svg',
    BASE_PATH + 'icons/icon-512.svg'
];

// Install: cache all essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch: network first, fallback to cache (ensures latest version when online)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Update cache with fresh response
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline: serve from cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Final fallback for navigation requests
                    if (event.request.destination === 'document') {
                        return caches.match(BASE_PATH + 'index.html');
                    }
                });
            })
    );
});
