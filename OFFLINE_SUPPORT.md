# Offline Support & Synchronization Design

## Overview
This document outlines the architecture for introducing Offline Support to the Food Tracker application. The goal is to ensure the application remains functional without a network connection and reliably synchronizes data with the Google Sheets backend when connectivity is restored.

We will strictly adhere to the **Redux Event Sourcing** pattern, using **IndexedDB** as a local write-through cache. The Google Sheet acts as the durable, upstream event log.

## Core Architecture

### 1. IndexedDB as Single Source of Truth (Local)
Instead of treating the API (Google Sheets) as the primary data source during a session, the application will treat a local **IndexedDB** as the immediate system of record.
- **Library**: `idb` (lightweight wrapper around IndexedDB).
- **Store Name**: `events`
- **Schema**:
  ```typescript
  interface PersistedEvent {
    id: string;          // UUID, Primary Key
    type: string;        // Redux action type (e.g., 'LOG_FOOD')
    payload: any;        // Action payload
    timestamp: number;   // Unix timestamp of occurrence
    syncStatus: 'pending' | 'synced' | 'failed';
    syncedAt?: number;   // Timestamp when confirmed on server
  }
  ```

### 2. Synchronization Workflow

The synchronization logic is bidirectional but "Local-First".

#### A. Write Path (User Action)
1.  **User acts**: (e.g., Logs food).
2.  **Redux Action**: A Redux action is dispatched with a client-generated UUID.
3.  **Persistence**: A custom **Redux Middleware** intercepts the action.
    -   Writes the event to IndexedDB with `syncStatus: 'pending'`.
    -   *Passes* the action to the reducer to update the UI immediately (Optimistic UI).
4.  **Background Sync**: The middleware triggers the Sync Manager.

#### B. Outbound Sync (Upload)
1.  **Trigger**: Triggered by new pending events or network online event.
2.  **Process**:
    -   Query IndexedDB for all events where `syncStatus === 'pending'`.
    -   Sort by `timestamp`.
    -   Loop through events and call `sheets.appendRow`.
    -   **On Success**: Update IndexedDB event to `syncStatus: 'synced'`.
    -   **On Failure**: Leave as `pending`. Update global "Sync Health" state (see UI).

#### C. Inbound Sync (Hydration & Replay)
1.  **App Start**:
    -   Load *all* events from IndexedDB.
    -   Dispatch to Redux Store to hydrate state (Instant Load).
2.  **Fetch Upstream**:
    -   Call `sheets.fetchRows`.
    -   Parse rows into Event objects.
3.  **Reconciliation**:
    -   Filter out events that already exist in the Redux state (deduplication via UUID).
    -   Identify *new* events from other clients.
    -   Dispatch new events to Redux Store.
    -   Persist new events to IndexedDB with `syncStatus: 'synced'`.

## Idempotency & Conflict Resolution

### Idempotency
To prevent double-counting (e.g., if a network call times out but the row was actually written), strictly enforce **UUIDs** for all events.
-   **Client**: Generates a UUID for every action.
-   **Redux Reducer**: Maintains a `seenEventIds: Set<string>` state.
    -   If an action comes in with a known ID, **ignore it**.
    -   This allows us to aggressively "replay" the Sheet or IndexedDB without fear of corruption.

### Multi-Client Conflicts
Since the application usage is primarily an **append-only log** of food entries:
-   **Insertions**: Order is not strictly critical for data integrity, only for display. Two clients logging "Breakfast" offline will result in both entries appearing when online.
-   **Edits/Deletes**: These must be modeled as new events (`log/entryUpdated`, `log/entryDeleted`) referencing the `targetEventId`.
    -   The Redux Reducer applies these in timestamp order.
    -   *Edge Case*: Client A deletes Entry X offline. Client B edits Entry X offline.
    -   *Resolution*: Upon sync, both events arrive. The Reducer logic dictates the final state (e.g., a Delete event effectively "wins" by removing the item, rendering the Edit moot).

## UI Considerations

### Offline & Sync Indicators
We need a visible status indicator in the header or footer:
-   **🟢 Saved**: All local events are synced.
-   **🟡 Syncing...**: Outbound requests in progress.
-   **🟠 Offline (3 items pending)**: Network is down, items queued locally.
-   **🔴 Sync Failed**: Retryable error occurred (e.g., auth expired).

### Toast Notifications
-   Show a "You are offline" toast once when connection drops.
-   Show "Back online - Syncing..." when restored.

## Sheet Limits & Partitioning

Google Sheets has a 10 million cell limit. While high, infinite logging will eventually hit it.

### Strategy: Annual Partitioning
We will effectively "sharding" the log by year using **Sheet Tabs (Worksheets)**.

1.  **Naming Convention**: `Events_2025`, `Events_2026`.
2.  **Writing**:
    -   Calculate target sheet name based on `new Date().getFullYear()`.
    -   Ensure that sheet exists (create if missing).
    -   Append to that specific sheet.
3.  **Reading**:
    -   Ideally, we only fetch the *current* year's events for the initial render to keep it fast.
    -   We can provide a "Load History" button to fetch previous years' tabs if needed for analytics.
4.  **Overflow**:
    -   If a single year exceeds limits (unlikely for a personal food tracker ~20k rows/year is tiny compared to 5M cells), we can fallback to `Events_2026_Part2`.
    -   *Calculation*: 20k rows * 10 columns = 200k cells. 10M cells is plenty for decades. We primarily partition for *performance*, not storage limits.

## Implementation Steps

1.  **Install `idb`**: `npm install idb`.
2.  **Create `src/lib/db.ts`**: Encapsulate all IndexedDB logic.
    -   `initDB()`
    -   `saveEvent(event)`
    -   `getPendingEvents()`
    -   `markEventSynced(id)`
3.  **Create Middleware `src/lib/redux-sync-middleware.ts`**:
    -   Intercept actions, persist to DB.
    -   Trigger sync manager.
4.  **Update `src/lib/sheets.ts`**:
    -   Add `ensureYearlySheet(year)` logic.
    -   Update `appendRow` to target dynamic sheet names.
5.  **Refactor `App.svelte` / `Layout`**:
    -   Init DB on mount.
    -   Load initial state from DB.
    -   Start background sync polling or event listeners.

## Dependency Additions
- `idb`: Lightweight Promise-based IndexedDB wrapper.
