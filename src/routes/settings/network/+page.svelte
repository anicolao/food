<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getPendingEvents } from '$lib/db';
    import { syncManager } from '$lib/sync-manager';
    import { store, setConfig } from '$lib/store';
    
    let isOnline = true;
    let pendingCount = 0;
    let isSyncing = false;
    let interval: any;
    let pendingEvents: any[] = [];
    
    // Config state
    let spreadsheetId = '';
    let sheetName = 'TheFoodTrackerEventLog'; // Hardcoded default based on sheets.ts knowledge

    async function checkStatus() {
        isOnline = navigator.onLine;
        isSyncing = syncManager.isSyncing;
        pendingEvents = await getPendingEvents();
        pendingCount = pendingEvents.length;
        
        const state = store.getState();
        spreadsheetId = state.config.spreadsheetId || '';
    }

    onMount(() => {
        isOnline = navigator.onLine;
        window.addEventListener('online', checkStatus);
        window.addEventListener('offline', checkStatus);
        
        interval = setInterval(checkStatus, 1000); 
        checkStatus();
    });

    onDestroy(() => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', checkStatus);
            window.removeEventListener('offline', checkStatus);
            clearInterval(interval);
        }
    });
    
    async function handleForceSync() {
        await syncManager.sync();
        await checkStatus();
    }
</script>

<div class="network-settings">
    <header>
        <h1>Network & Sync</h1>
    </header>

    <section class="card">
        <h2>Connection</h2>
        <div class="status-row">
            <span class="label">Status</span>
            <span class="value {isOnline ? 'online' : 'offline'}">
                {isOnline ? 'Online' : 'Offline'}
            </span>
        </div>
        <div class="status-row">
            <span class="label">Sync Activity</span>
            <span class="value">
                {isSyncing ? 'Syncing...' : 'Idle'}
            </span>
        </div>
    </section>

    <section class="card">
        <h2>Unsynced Data</h2>
        <div class="status-row">
            <span class="label">Pending Items</span>
            <span class="value">{pendingCount}</span>
        </div>
        
        {#if pendingCount > 0}
            <div class="pending-list">
                {#each pendingEvents.slice(0, 5) as event}
                    <div class="pending-item">
                        <span class="type">{event.type}</span>
                        <span class="time">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                {/each}
                {#if pendingCount > 5}
                    <div class="more">... and {pendingCount - 5} more</div>
                {/if}
            </div>
            
            <button on:click={handleForceSync} disabled={!isOnline || isSyncing}>
                {isSyncing ? 'Syncing...' : 'Force Sync Now'}
            </button>
        {/if}
    </section>

    <section class="card">
        <h2>Configuration</h2>
        <div class="field">
            <label for="sheetId">Spreadsheet ID</label>
            <input id="sheetId" type="text" value={spreadsheetId} disabled />
        </div>
        <p class="help">Managed via Google Drive integration.</p>
    </section>
</div>

<style>
    .network-settings {
        padding: 1rem;
        max-width: 600px;
        margin: 0 auto;
    }
    
    header {
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 600;
    }

    .card {
        background: rgba(255,255,255,0.8);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }
    
    h2 {
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 1rem;
        color: #444;
    }
    
    .status-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }
    
    .value.online { color: #2ecc71; font-weight: 600; }
    .value.offline { color: #e74c3c; font-weight: 600; }
    
    .pending-list {
        margin: 1rem 0;
        background: rgba(0,0,0,0.03);
        border-radius: 8px;
        padding: 1rem;
    }
    
    .pending-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        padding: 0.25rem 0;
        border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .pending-item:last-child { border-bottom: none; }
    
    .type { font-family: monospace; }
    .time { color: #888; }
    
    button {
        width: 100%;
        padding: 0.75rem;
        background: var(--primary-color, #3498db);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
    }
    
    button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
    
    .field {
        margin-bottom: 0.5rem;
    }
    
    input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #f9f9f9;
    }
    
    .help {
        font-size: 0.8rem;
        color: #888;
    }
</style>
