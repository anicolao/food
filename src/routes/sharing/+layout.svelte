<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { store, setContext } from '$lib/store';
    import { setDatabaseContext, getAllEvents } from '$lib/db';
    import { syncManager } from '$lib/sync-manager';
    import { initializeAuth } from '$lib/auth';
    import { ensureConnectedToSharedFolder } from '$lib/sheets';
    import { batchHydrateEvents } from '$lib/store';
    import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
    import DesktopSidebar from '$lib/components/ui/DesktopSidebar.svelte';

    let { children } = $props();

    let isLoading = $state(true);
    let error = $state<string | null>(null);

    const folderId = $page.url.searchParams.get('folderId') || store.getState().config.folderId;

    // Immediately set context during initialization so children can access it
    if (folderId) {
        console.log('[SharingLayout] Setting Shared Context (Init). Folder:', folderId);
        store.dispatch({ type: 'global/resetState' });
        setDatabaseContext(folderId);
        store.dispatch(setContext({ isReadOnly: true, folderId }));
    }

    onMount(async () => {
        if (!folderId) {
            error = 'No folder ID provided for sharing.';
            isLoading = false;
            return;
        }

        console.log('[SharingLayout] Mounting Shared Context. Folder:', folderId);

        // 2. Auth & Connect
        initializeAuth(async () => {
            try {
                // Verify we can access the folder/DB
                const { spreadsheetId } = await ensureConnectedToSharedFolder(folderId);
                
                // Update Config with explicit spreadsheetId found in that folder
                store.dispatch({ 
                    type: 'config/setConfig', 
                    payload: { spreadsheetId, folderId, isReadOnly: true } 
                });

                // 3. Hydrate from Context-Scoped DB
                console.log('[SharingLayout] Hydrating from keyspace...');
                const events = await getAllEvents();
                if (events.length > 0) {
                     store.dispatch(batchHydrateEvents(events) as any);
                }

                // 4. Trigger Sync (Read Only)
                // The sync manager will see isReadOnly in storeconfig? 
                // Actually syncManager doesn't check isReadOnly, it just syncs.
                // But redux-middleware blocks writes.
                // SyncManager inbound sync is fine.
                // SyncManager outbound sync will be empty because we prevent writes.
                await syncManager.sync();

                isLoading = false;

            } catch (e: any) {
                console.error('[SharingLayout] Initialization Failed', e);
                error = `Failed to load shared log: ${e.message}`;
                isLoading = false;
            }
        });
    });

    onDestroy(() => {
        console.log('[SharingLayout] Destroying Shared Context.');
        // Revert to default
        setDatabaseContext('default'); // Switch DB back
        store.dispatch({ type: 'global/resetState' }); // Clear Shared Data
        store.dispatch(setContext({ isReadOnly: false, folderId: null })); // Reset Config
        
        // We do NOT automatically re-hydrate the main app here because
        // SvelteKit will typically navigate to another route which will standardly mount its own layout or page
        // However, if we navigate to root '/', the root layout might *already* be mounted if this was nested?
        // Wait, /sharing is a sibling of /, so root +layout.svelte is likely PARENT to both or shared.
        // If src/routes/+layout.svelte is the root, it stays mounted.
        // It has onMount logic.
        // If we navigate from /sharing to /, the root layout does NOT re-mount. 
        // So we MUST manually trigger re-hydration of the default context if we are returning to the app.

        // But wait, if sharing layout unmounts, we are effectively leaving the shared zone.
        // We should trigger a re-hydration of the default DB.
        
        // Let's do a best-effort re-hydration of default data.
        restoreDefaultContext();
    });

    async function restoreDefaultContext() {
        // Only run if we are indeed ensuring the default context is restoring
        // setDatabaseContext('default') was called above.
        
        // We need to fetch default events and hydrate.
        try {
             // Basic restoration
             const events = await getAllEvents(); // Now querying 'default'
             if (events.length > 0) {
                 store.dispatch(batchHydrateEvents(events) as any);
             }
             // Trigger sync for main app?
             syncManager.sync();
        } catch (e) {
            console.warn('[SharingLayout] Failed to restore default context on exit', e);
        }
    }

</script>

<div class="sharing-shell">
    {#if error}
        <div class="error-container">
            <h1>Unable to load shared log</h1>
            <p>{error}</p>
            <a href="/">Return Home</a>
        </div>
    {:else if isLoading}
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading Shared Data...</p>
        </div>
    {:else}
        <!-- Render the route content (LogPage, EntryPage) -->
         {@render children()}
    {/if}
    
    <ToastContainer />
</div>

<style>
    .sharing-shell {
        min-height: 100vh;
        background: black;
        color: white;
    }
    .error-container, .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        gap: 20px;
        text-align: center;
    }
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255,255,255,0.1);
        border-radius: 50%;
        border-top-color: var(--color-primary, cyan);
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
