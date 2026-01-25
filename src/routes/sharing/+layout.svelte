<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { store, setContext } from '$lib/store';
    import { setDatabaseContext, getAllEvents } from '$lib/db';
    import { syncManager } from '$lib/sync-manager';
    import { initializeAuth } from '$lib/auth';
    import { openDrivePicker, PickType } from '$lib/drive-picker';
    import { ensureValidToken } from '$lib/auth';
    import { toasts } from '$lib/toast';

    import { ensureConnectedToSharedFolder } from '$lib/sheets';
    import { batchHydrateEvents } from '$lib/store';
    import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
    import DesktopSidebar from '$lib/components/ui/DesktopSidebar.svelte';

    let { children } = $props();

    let needsManualConnection = $state(false);

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
                
                await connect(spreadsheetId);

            } catch (e: any) {
                console.error('[SharingLayout] Initialization Failed', e);
                // If the error is about not finding the file, offer manual picker
                if (e.message.includes('Shared Log not found') || e.message.includes('Drive Search Failed')) {
                     needsManualConnection = true;
                     isLoading = false;
                } else {
                    error = `Failed to load shared log: ${e.message}`;
                    isLoading = false;
                }
            }
        });
    });

    async function connect(spreadsheetId: string) {
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
        await syncManager.sync();

        isLoading = false;
        needsManualConnection = false;
    }

    async function handleManualConnect() {
        const token = await ensureValidToken();
        if (!token) {
            toasts.error('Please sign in first.');
            return;
        }
        try {
            // First try to pick the FOLDER. This grants access to the folder context.
            const pickedFolderId = await openDrivePicker(token, folderId, PickType.FOLDER);
            
            if (pickedFolderId) {
                isLoading = true;
                // Now try discovery again with the confirmed (and now authorized) folder
                try {
                     const { spreadsheetId } = await ensureConnectedToSharedFolder(pickedFolderId);
                     await connect(spreadsheetId);
                     return;
                } catch (discoveryError) {
                    console.warn('Discovery failed in picked folder, falling back to file pick', discoveryError);
                    isLoading = false;
                }
            }

            // Fallback: Pick the FILE directly if folder picking didn't work or didn't yield a DB
            // Or maybe the user cancelled folder pick? 
            // If pickedFolderId was null, user cancelled. don't auto open file picker.
            // But if discovery failed, maybe the file is there but not detected?
            
            if (pickedFolderId) {
                 const proceed = confirm('We opened the folder but couldn\'t find the log file automatically. Would you like to pick the Spreadsheet file directly?');
                 if (!proceed) return;
    
                 const pickedSpreadsheetId = await openDrivePicker(token, pickedFolderId, PickType.FILE);
                 if (pickedSpreadsheetId) {
                     isLoading = true;
                     await connect(pickedSpreadsheetId);
                 }
            }
            
        } catch (e: any) {
            console.error('Picker failed', e);
            toasts.error('Failed to pick file: ' + e.message);
            isLoading = false;
        }
    }
    
    onDestroy(() => {
        console.log('[SharingLayout] Destroying Shared Context.');
        // Revert to default
        setDatabaseContext('default'); // Switch DB back
        store.dispatch({ type: 'global/resetState' }); // Clear Shared Data
        store.dispatch(setContext({ isReadOnly: false, folderId: null })); // Reset Config
        
        restoreDefaultContext();
    });

    async function restoreDefaultContext() {
        try {
             const events = await getAllEvents(); // Now querying 'default'
             if (events.length > 0) {
                 store.dispatch(batchHydrateEvents(events) as any);
             }
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
    {:else if needsManualConnection}
         <div class="error-container">
            <h1>Connect Shared Log</h1>
            <p>We couldn't automatically find the Food Log in this folder. Please select it manually.</p>
            <button class="action-btn" onclick={handleManualConnect}>Select File from Drive</button>
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
    .action-btn {
        background: var(--color-primary, cyan);
        color: black;
        border: none;
        padding: 12px 24px;
        border-radius: 20px;
        font-weight: bold;
        cursor: pointer;
        font-size: 1rem;
    }
</style>
