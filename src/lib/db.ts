import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FoodEvent } from './store';

interface FoodTrackerDB extends DBSchema {
    events: {
        key: string;
        value: FoodEvent & {
            syncStatus: 'pending' | 'synced' | 'failed';
            syncedAt?: number;
        };
        indexes: { 'by-status': string; 'by-timestamp': string };
    };
}

const DB_NAME = 'events-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FoodTrackerDB>>;

export async function initDB() {
    if (!dbPromise) {
        dbPromise = openDB<FoodTrackerDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const store = db.createObjectStore('events', {
                    keyPath: 'eventId',
                });
                store.createIndex('by-status', 'syncStatus');
                store.createIndex('by-timestamp', 'timestamp');
            },
        });
    }
    return dbPromise;
}

export async function addEvent(event: FoodEvent) {
    const db = await initDB();
    return db.put('events', {
        ...event,
        syncStatus: 'pending',
    });
}

export async function getPendingEvents() {
    const db = await initDB();
    return db.getAllFromIndex('events', 'by-status', 'pending');
}

export async function markEventsSynced(eventIds: string[]) {
    const db = await initDB();
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');

    await Promise.all(
        eventIds.map(async (id) => {
            const event = await store.get(id);
            if (event) {
                event.syncStatus = 'synced';
                event.syncedAt = Date.now();
                await store.put(event);
            }
        })
    );

    await tx.done;
}

export async function getAllEvents() {
    const db = await initDB();
    return db.getAllFromIndex('events', 'by-timestamp');
}

export async function addSyncedEvent(event: FoodEvent) {
    const db = await initDB();
    // Only add if it doesn't exist to prevent overwriting local pending state if any race condition
    // But usually this is used for hydration or incoming sync
    const existing = await db.get('events', event.eventId);
    if (!existing) {
        return db.put('events', {
            ...event,
            syncStatus: 'synced',
            syncedAt: Date.now(),
        });
    }
}
