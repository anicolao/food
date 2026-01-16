import { getPendingEvents, markEventsSynced, addSyncedEvent, clearAllSyncedEvents } from './db';
import { appendRow, fetchRows, appendRows } from './sheets'; // We'll need to update sheets.ts to support batch append if we want true batching, or just loop for now
import { store, processEvent, appendEvent, ingestSyncedEvent } from './store';
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
            // Fetch starting from the last synced row to verify overlap (unless it's row 0/1)
            const state = store.getState();
            const { spreadsheetId } = state.config;

            if (spreadsheetId) {
                // Get last synced row index (default to 0 if no headers involved in tracking)
                const lastSyncedRow = parseInt(localStorage.getItem('lastSyncedRow') || '0', 10);
                const lastSyncedEventId = localStorage.getItem('lastSyncedEventId');

                // If we have synced data (row > 0), we fetch overlapping to verify.
                // If row is 0, we fetch from 1.
                const startRow = lastSyncedRow > 0 ? lastSyncedRow : 1;

                console.log(`[SyncManager] Fetching from row ${startRow}...`);
                const rows = await fetchRows(spreadsheetId, 'Events', startRow);

                if (rows && rows.length > 0) {
                    let newRows = rows;

                    // Verification Logic
                    if (lastSyncedRow > 0) {
                        const overlappingRow = rows[0];
                        const overlappingEventId = overlappingRow[0];

                        // If lastSyncedEventId exists (for safety), verify it matches
                        if (lastSyncedEventId && overlappingEventId !== lastSyncedEventId) {
                            console.warn(`[SyncManager] Sync Mismatch! Expected ${lastSyncedEventId}, got ${overlappingEventId}. Resetting sync pointer.`);
                            localStorage.setItem('lastSyncedRow', '0');
                            localStorage.removeItem('lastSyncedEventId');
                            return; // Next sync will start from 1
                        }

                        // Verification Passed: Discard overlapping row
                        newRows = rows.slice(1);
                    }

                    if (newRows.length > 0) {
                        console.log(`[SyncManager] Received ${newRows.length} new rows.`);
                        let lastEventIdProcessed = lastSyncedEventId;

                        for (const row of newRows) {
                            const [eventId, timestamp, type, payloadStr] = row;
                            if (!eventId || !type) continue;

                            lastEventIdProcessed = eventId;

                            // Check if we already have this event (deduplication still good safety net)
                            const existingEvent = state.events.find(e => e.eventId === eventId);

                            if (!existingEvent) {
                                let payload = {};
                                try {
                                    payload = JSON.parse(payloadStr);
                                } catch (e) {
                                    console.error('Failed to parse payload for event', eventId, e);
                                }

                                const event = { eventId, timestamp, type, payload };

                                // 1. Add to DB as synced
                                // await addSyncedEvent(event); // Optimization: batch add in future?
                                await addSyncedEvent(event);

                                // 2. Ingest into Redux
                                store.dispatch(ingestSyncedEvent(event));
                            }
                        }

                        // Update Pointer
                        // lastSyncedRow is base (exclusive of overlap if verified).
                        // If lastSyncedRow=0, fetched from 1. newRows.length entries. 0 + len = len.
                        // If lastSyncedRow=1, fetched from 1. 1 overlap. newRows slice(1). 1 + len = new index.
                        const finalRowIndex = lastSyncedRow + newRows.length;

                        localStorage.setItem('lastSyncedRow', finalRowIndex.toString());
                        if (lastEventIdProcessed) {
                            localStorage.setItem('lastSyncedEventId', lastEventIdProcessed);
                        }
                        console.log(`[SyncManager] Updated lastSyncedRow to ${finalRowIndex}`);
                    } else {
                        console.log('[SyncManager] Verified up to date.');
                    }
                } else {
                    // If we asked for startRow and got [], it means it's empty or truncated.
                    // If lastSyncedRow > 0, we expected at least overlap.
                    if (lastSyncedRow > 0) {
                        console.warn('[SyncManager] Last synced row missing. Sheet truncated? Resetting.');
                        localStorage.setItem('lastSyncedRow', '0');
                        localStorage.removeItem('lastSyncedEventId');
                    }
                }
            }

        } catch (e: any) {
            console.error('[SyncManager] Sync failed:', e);
            // Check for 400 Bad Request
            let status = 0;
            try {
                const errObj = JSON.parse(e.message);
                status = errObj.status;
            } catch (jsonErr) {
                // Not JSON
            }

            if (status === 400) {
                // We asked for a range (e.g. 2115:Z) and got 400.
                // This MOST LIKELY means 2115 does not exist.
                // So our pointer is invalid. Reset.
                console.warn('[SyncManager] 400 Error on fetch. Pointer invalid. Resetting.');
                localStorage.setItem('lastSyncedRow', '0');
                localStorage.removeItem('lastSyncedEventId');
                return;
            }
        } finally {
            this.isSyncing = false;
        }
    },

    async hardResync() {
        console.warn('[SyncManager] Hard Reset Initiated.');

        // 1. Reset Pointer
        localStorage.setItem('lastSyncedRow', '0');
        localStorage.removeItem('lastSyncedEventId');

        // 2. Clear Local Cache (Synced Items Only - preserve pending!)
        await clearAllSyncedEvents();

        // 3. Reload
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }
};


