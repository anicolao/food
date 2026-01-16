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

    e.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
    const e = event as FetchEvent;

    // IGNORE requests for Google APIs
    if (e.request.url.includes('googleapis.com')) return;

    // Ignore non-GET requests
    if (e.request.method !== 'GET') return;

    // IGNORE chrome-extension requests
    if (e.request.url.startsWith('chrome-extension://')) return;

    async function respond() {
        const url = new URL(e.request.url);
        const cache = await caches.open(CACHE);

        // 1. Assets (build/static): CACHE-FIRST
        if (ASSETS.includes(url.pathname)) {
            const cachedResponse = await cache.match(url.pathname);
            if (cachedResponse) return cachedResponse;
        }

        // 2. Navigation (HTML): CACHE-FIRST 
        if (e.request.mode === 'navigate') {
            try {
                const cachedResponse = await cache.match(e.request);
                if (cachedResponse) return cachedResponse;

                const networkResponse = await fetch(e.request);
                return networkResponse;
            } catch (error) {
                // Offline Fallback
                const offlineCache = await cache.match('/offline.html');
                if (offlineCache) return offlineCache;

                const rootCache = await cache.match('/');
                if (rootCache) return rootCache;

                return new Response('Offline', { status: 408 });
            }
        }

        // 3. Other Requests
        try {
            const cachedResponse = await cache.match(e.request);
            if (cachedResponse) return cachedResponse;

            const response = await fetch(e.request);
            return response;
        } catch {
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
