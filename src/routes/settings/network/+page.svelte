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

    async function handleHardResync() {
        if (confirm('This will delete your local cache of synced events and re-download everything from Google Sheets. Your pending items will be preserved. Continue?')) {
            await syncManager.hardResync();
        }
    }
</script>

<div class="network-settings">
    <header>
        <h1>Network & Sync</h1>
    </header>

    <section class="card glass-panel">
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

    <section class="card glass-panel">
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
            
            <button class="primary-btn neon-gradient" on:click={handleForceSync} disabled={!isOnline || isSyncing}>
                {isSyncing ? 'Syncing...' : 'Force Sync Now'}
            </button>
        {/if}
    </section>

    <section class="card glass-panel">
        <h2>Configuration</h2>
        <div class="field">
            <label for="sheetId">Spreadsheet ID</label>
            <input id="sheetId" type="text" value={spreadsheetId} disabled />
        </div>
        <p class="help">Managed via Google Drive integration.</p>
    </section>

    <section class="actions">
         <button class="text-btn danger" on:click={handleHardResync} disabled={!isOnline || isSyncing}>
            Reset Cache & Resync
        </button>
        <p class="help">Use this if your data is out of sync with Google Sheets.</p>
    </section>
</div>

<style>
    .network-settings {
        padding: 1rem;
        max-width: 600px;
        margin: 0 auto;
        color: white;
    }
    
    header {
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: white;
    }

    .card {
        background: var(--bg-card-glass, rgba(28, 30, 36, 0.7));
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        color: white;
    }
    
    h2 {
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 1rem;
        color: var(--text-primary, #fff);
    }
    
    .status-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        color: var(--text-secondary, #a0a0a0);
    }
    
    .value { color: white; font-weight: 500; }
    .value.online { color: #2ecc71; }
    .value.offline { color: #e74c3c; }
    
    .pending-list {
        margin: 1rem 0;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
        padding: 1rem;
    }
    
    .pending-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        padding: 0.25rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        color: var(--text-secondary, #ccc);
    }
    
    .pending-item:last-child { border-bottom: none; }
    
    .type { font-family: monospace; color: var(--text-accent, #ff9966); }
    .time { color: #888; }
    
    button {
        width: 100%;
        padding: 0.75rem;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .primary-btn {
        background: var(--primary-color, #3498db);
        color: white;
    }
    
    .text-btn.danger {
        background: rgba(231, 76, 60, 0.1);
        color: #e74c3c;
        border: 1px solid rgba(231, 76, 60, 0.3);
    }

    .field {
        margin-bottom: 0.5rem;
    }
    
    label {
        display: block;
        font-size: 0.8rem;
        color: var(--text-secondary, #aaa);
        margin-bottom: 4px;
    }
    
    input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        background: rgba(0,0,0,0.3);
        color: white;
        font-family: monospace;
    }
    
    .help {
        font-size: 0.8rem;
        color: #666;
        margin-top: 0.5rem;
        text-align: center;
    }
    
    .actions {
        margin-top: 2rem;
    }
</style>
