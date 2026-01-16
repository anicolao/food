/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
    ...build, // the app itself
    ...files  // everything in `static`
];

self.addEventListener('install', (event) => {
    const e = event as ExtendableEvent;
    // Create a new cache and add all files to it
    async function addFilesToCache() {
        const cache = await caches.open(CACHE);
        await cache.addAll(ASSETS);
    }

    e.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
    const e = event as ExtendableEvent;
    // Remove previous caches
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key);
        }
    }

    event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
    const e = event as FetchEvent;
    // IGNORE requests for Google APIs (handled by app logic/IndexedDB)
    if (e.request.url.includes('googleapis.com')) return;

    // Ignore non-GET requests
    if (e.request.method !== 'GET') return;

    // IGNORE chrome-extension requests (common source of errors)
    if (e.request.url.startsWith('chrome-extension://')) return;

    async function respond() {
        const url = new URL(e.request.url);
        const cache = await caches.open(CACHE);

        // 1. Assets (build/static): CACHE-FIRST
        if (ASSETS.includes(url.pathname)) {
            const cachedResponse = await cache.match(url.pathname);
            if (cachedResponse) return cachedResponse;
        }

        // 2. Navigation (HTML): CACHE-FIRST (stale-while-revalidate manually via SW update cycle)
        // Since we are an SPA, we mostly care about the root HTML or specific routes serving the app shell.
        // For strict Offline-First speed, we serve from cache if available.
        try {
            const cachedResponse = await cache.match(e.request);
            if (cachedResponse) return cachedResponse;

            // Fallback: Network
            const response = await fetch(e.request);

            // Optional: Runtime caching for other GET requests?
            // For now, adhering to strict design: Build assets + Static only.

            if (response.status === 200) {
                // cache.put(event.request, response.clone()); 
            }

            return response;
        } catch {
            // Offline fallback?
            // If completely offline and not in cache, we failed.
            // But usually we hit the cache above.
            return new Response('Offline', { status: 408 });
        }
    }

    e.respondWith(respond());
});

// Update Listener
self.addEventListener('message', (event) => {
    const e = event as ExtendableMessageEvent;
    if (e.data && e.data.type === 'SKIP_WAITING') {
        (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
    }
});
