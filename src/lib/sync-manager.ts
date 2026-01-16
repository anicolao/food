import { getPendingEvents, markEventsSynced, addSyncedEvent } from './db';
import { appendRow, fetchRows, appendRows } from './sheets'; // We'll need to update sheets.ts to support batch append if we want true batching, or just loop for now
import { store, processEvent, appendEvent } from './store';
import { get } from 'svelte/store';

// We need a way to check online status.
// For now, we'll rely on navigator.onLine and window events in the UI/Layout to trigger this.

export const syncManager = {
    isSyncing: false,

    async sync() {
        if (this.isSyncing) return;
        if (!navigator.onLine) return;

        this.isSyncing = true;
        console.log('[SyncManager] Starting sync...');

        try {
            // 1. Outbound Sync
            const pendingEvents = await getPendingEvents();
            if (pendingEvents.length > 0) {
                console.log(`[SyncManager] Found ${pendingEvents.length} pending events.`);

                // Sort by timestamp to preserve order
                pendingEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                const state = store.getState();
                const { spreadsheetId } = state.config;

                if (spreadsheetId) {
                    // Iterate for now as our sheets.ts generic wrapper is single-row oriented? 
                    // Wait, implementation plan said "Update sheets.ts to support batch".
                    // Let's implement batching in sheets.ts next.
                    // For this draft, I'll assume I can pass an array of arrays to a new `appendRows` or modified `appendRow`.
                    // Let's stick to the current `appendRow` signature which takes `values: any[]`.
                    // If I want to append multiple rows, I need to send `values: [[row1], [row2]]`.
                    // The current `appendRow` wraps the input `values` in another array: `values: [values]`.
                    // So it only supports one row. I WILL update sheets.ts.

                    // Prepare batch data
                    const rows = pendingEvents.map(e => [
                        e.eventId,
                        e.timestamp,
                        e.type,
                        JSON.stringify(e.payload)
                    ]);

                    // We need a new function in sheets.ts or modify existing. I'll modify existing to support batch.
                    // But for now, let's assume `appendRows` exists.
                    await appendRows(spreadsheetId, 'Events', rows);

                    // Mark synced
                    await markEventsSynced(pendingEvents.map(e => e.eventId));
                    console.log('[SyncManager] Outbound sync complete.');
                }
            }

            // 2. Inbound Sync
            // Fetch all rows
            const state = store.getState();
            const { spreadsheetId } = state.config;

            if (spreadsheetId) {
                const rows = await fetchRows(spreadsheetId, 'Events');
                // rows is array of arrays: [id, timestamp, type, payload]
                // Skip header if any? implementation doesn't seem to have headers in `appendRow`.

                for (const row of rows) {
                    const [eventId, timestamp, type, payloadStr] = row;
                    if (!eventId || !type) continue;

                    // Check if we have this event
                    const existingEvent = state.events.find(e => e.eventId === eventId);

                    if (!existingEvent) {
                        // New event!
                        let payload = {};
                        try {
                            payload = JSON.parse(payloadStr);
                        } catch (e) {
                            console.error('Failed to parse payload for event', eventId, e);
                        }

                        const event = { eventId, timestamp, type, payload };

                        // 1. Add to DB as synced
                        await addSyncedEvent(event);

                        // 2. Dispatch to Redux (Redux will persist again? No, we need a way to skip persistence)
                        // Actually, we should probably just dispatch `appendEvent` but our middleware will catch it.
                        // We need a flag or a different action to bypass middleware persistence if it's already in DB.
                        // OR, middleware checks DB?
                        // Better: `store.dispatch({ type: 'eventLog/hydrateEvent', payload: event })` ?
                        // Current `appendEvent` is used for new local events.
                        // Let's add a `hydrateEvent` or ensure middleware knows to ignore "incoming" syncs.
                        // Or, middleware does `put` which is upsert. If we set syncStatus='synced' in payload?
                        // The middleware sets 'pending'.

                        // Simpler: Just update state directly? No, redux rules.
                        // Let's rely on a new action `ingestSyncedEvent`.
                        store.dispatch(processEvent(event));
                        store.dispatch(appendEvent(event));
                        // Wait, if I dispatch appendEvent, middleware will see it and set it to pending!
                        // I need to update `store.ts` to handle this or middleware to filter.
                    }
                }
            }

        } catch (e) {
            console.error('[SyncManager] Sync failed:', e);
        } finally {
            this.isSyncing = false;
        }
    }
};


