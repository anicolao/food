# Sharing Feature Design

## Goal
Enable users to share their food log with others via a simple link:
`https://anicolao.github.io/food/sharing?folderId=DRIVE_FOLDER_ID`

Recipients should see a read-only version of the food log, backed by the shared Google Drive folder data. The performance should equal the native app, leveraging local caching (IndexedDB) separated by folder ID to prevent data pollution.

## Core Requirements
1.  **Read-Only Access**: Viewers cannot modify the shared log.
2.  **Shared Data Source**: Data is sourced specifically from the `folderId` provided in the URL.
3.  **Data Isolation**: Shared data must be cached in a separate local store (IndexedDB) from the user's personal data.
4.  **Maximize Reuse**: Reuse existing UI components, `store`, `sync-manager`, and authentication logic.

## Architecture

### 1. Context-Aware Database (`src/lib/db.ts`)
The current `db.ts` uses a hardcoded `DB_NAME`. We will refactor this to support dynamic database namespaces.

*   **Change**: Introduce a context management system in `db.ts`.
*   **Mechanism**:
    *   Export `setDatabaseContext(contextId: string)`.
    *   `contextId` defaults to `'default'` (User's private log).
    *   For sharing, `contextId` will be the `folderId`.
    *   Updates `initDB` to open `events-db-${contextId}`.

### 2. Synchronization Context (`src/lib/sync-manager.ts`)
The `syncManager` currently relies on the global store configuration. It needs to become context-aware to sync strictly with the target folder.

*   **Change**: `syncManager` must respect the active Data Context.
*   **Discovery**: Update `ensureDataStructures` (or create a variant `ensureSharedDataConnection`) to look strictly within the provided `folderId` and *not* create new folders if missing (fail if not found).

### 3. Redux Store Adaptation (`src/lib/store.ts`)
The Redux store is a singleton. To support context switching without a full page reload, we need a mechanism to "reset" and "re-hydrate" the store when switching contexts.

*   **New Action**: `config/setContext`
    *   Payload: `{ isReadOnly: boolean, folderId: string | null }`
    *   Effect: Updates `config.isReadOnly`.
*   **New Action**: `global/resetState`
    *   Effect: Clears `events`, `log`, `stats`, `favourites` to initial empty state.
*   **Middleware**: Update `syncMiddleware` to block `eventLog/appendEvent` if `state.config.isReadOnly` is true.

### 4. Routing (`src/routes/sharing/+page.svelte`)
A new route will handle the context switching lifecycle.

**Lifecycle on Mount:**
1.  Parse `folderId` from URL query params.
2.  **Auth Check**: Ensure user is authenticated (reuse `auth.ts`).
3.  **Context Switch**:
    *   Call `db.setDatabaseContext(folderId)`.
    *   Dispatch `global/resetState`.
    *   Dispatch `config/setContext({ isReadOnly: true, folderId })`.
4.  **Hydration**:
    *   Call `db.getAllEvents()` to load cached shared data.
    *   Dispatch `hydrateAllEvents` to Redux.
5.  **Sync**:
    *   Trigger `syncManager.sync()` (which will now use the shared DB and shared folder).

**Lifecycle on Destroy (Navigation Away):**
1.  **Context Revert**:
    *   Call `db.setDatabaseContext('default')`.
    *   Dispatch `global/resetState`.
    *   Dispatch `config/setContext({ isReadOnly: false, folderId: null })`.
2.  **Hydration**:
    *   Load user's personal data from `db.getAllEvents('default')`.
    *   Hydrate Redux.

### 5. UI Components
Components must respect the `readOnly` state.

*   **Selectors**: Use `$store.config.isReadOnly` in components.
*   **Modifications**:
    *   **Log Page**: Hide "Add" button.
    *   **Entry Detail**: Disable inputs, hide "Save/Delete" buttons.
    *   **Settings**: Hide/Disable network or goal settings (or make them local-only view preferences).

## Implementation Plan

1.  **Refactor DB**: Update `src/lib/db.ts` to support `setDatabaseContext`.
2.  **Update Store**: Add `resetState` reducer and `isReadOnly` config.
3.  **Update Middleware**: Block writes in `redux-sync-middleware.ts` when ReadOnly.
4.  **Create Route**: Implement `src/routes/sharing/+page.svelte` with the lifecycle logic described.
5.  **Update Components**: Audit key components (`LogPage`, `EntryDetail`, `NutritionCard`) to hide controls when `isReadOnly`.
6.  **Discovery Logic**: Ensure `sheets.ts` can find the DB file strictly inside a given `folderId` without creating it.

## Auth Note
"Anyone with the link" refers to the Drive Folder permission.
*   The Viewer **must** sign in with their Google Account to use the Drive API.
*   The App's `auth.ts` handles this naturally.
*   If the folder is shared with "Anyone with the link", the Viewer's token will successfully list/read files in that folder.
