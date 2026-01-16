<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getPendingEvents } from '$lib/db';
    import { syncManager } from '$lib/sync-manager';
    import { store, setConfig } from '$lib/store';
    import { getFileMetadata, renameFile, findDatabaseFiles } from '$lib/sheets';
    
    let isOnline = true;
    let pendingCount = 0;
    let isSyncing = false;
    let interval: any;
    let pendingEvents: any[] = [];
    
    // Config state
    let spreadsheetId = '';
    let sheetName = '';
    let isRenaming = false;
    
    // Picker state
    let availableFiles: any[] = [];
    let showPicker = false;
    let isLoadingFiles = false;

    async function checkStatus() {
        isOnline = navigator.onLine;
        isSyncing = syncManager.isSyncing;
        pendingEvents = await getPendingEvents();
        pendingCount = pendingEvents.length;
        
        const state = store.getState();
        spreadsheetId = state.config.spreadsheetId || '';
        
        // Initial fetch of sheet name if we have ID but no name yet
        if (spreadsheetId && !sheetName && !isRenaming && isOnline) {
            try {
                const meta = await getFileMetadata(spreadsheetId);
                sheetName = meta.name;
            } catch (e) {
                console.error('Failed to fetch sheet name', e);
                sheetName = 'Unknown (Error fetching)';
            }
        }
    }

    onMount(() => {
        isOnline = navigator.onLine;
        window.addEventListener('online', checkStatus);
        window.addEventListener('offline', checkStatus);
        
        interval = setInterval(checkStatus, 2000); 
        checkStatus();
    });

    onDestroy(() => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', checkStatus);
            window.removeEventListener('offline', checkStatus);
            clearInterval(interval);
        }
    });

    async function loadAvailableFiles() {
        if (!isOnline) return;
        isLoadingFiles = true;
        try {
            // Find all tagged files. (We don't need parentId for global search if we rely on tags, 
            // but providing folderId is safer if we knew it. For now, tag search is robust enough globally or we assume FoodLog folder context implicitly).
            // Actually, sheets.ts findDatabaseFiles accepts optional parentId. 
            // We'll search globally for simplicity or we'd need to fetch folderId again.
            // Let's rely on tag search which is specific enough.
            availableFiles = await findDatabaseFiles();
        } catch (e) {
            console.error('Failed to load files', e);
        } finally {
            isLoadingFiles = false;
        }
    }

    function togglePicker() {
        showPicker = !showPicker;
        if (showPicker) {
            loadAvailableFiles();
        }
    }
    
    async function switchDatabase(fileId: string) {
        if (fileId === spreadsheetId) return;
        
        if (confirm('Switching databases will reset your local cache and resync from the selected file. Continue?')) {
            // update store config
            const current = store.getState().config;
            setConfig({ ...current, spreadsheetId: fileId });
            spreadsheetId = fileId;
            sheetName = ''; // Force refresh
            showPicker = false;
            
            // Hard resync logic to clear old data and fetch new
             await syncManager.hardResync();
        }
    }

    async function handleForceSync() {
        await syncManager.sync();
        await checkStatus();
    }

    async function handleHardResync() {
        if (confirm('This will delete your local cache of synced events and re-download everything from Google Sheets. Your pending items will be preserved. Continue?')) {
            await syncManager.hardResync();
        }
    }

    async function handleRename() {
        if (!spreadsheetId) return;
        const newName = prompt('Enter new name for the Google Sheet:', sheetName);
        if (newName && newName !== sheetName) {
            try {
                isRenaming = true;
                await renameFile(spreadsheetId, newName);
                sheetName = newName;
                console.log('Spreadsheet renamed successfully.');
            } catch (e) {
                console.error('Rename failed', e);
                console.error('Failed to rename spreadsheet.');
            } finally {
                isRenaming = false;
            }
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
            <label for="sheetName">Spreadsheet Name</label>
            <div class="input-group">
                <input id="sheetName" type="text" value={sheetName} readonly />
                <button class="icon-btn" on:click={handleRename} disabled={!isOnline || isRenaming} aria-label="Rename">
                    ✏️
                </button>
            </div>
        </div>
        
        <div class="field">
            <label for="picker">Active Database File</label>
            <div class="picker-controls">
                <button class="secondary-btn small" on:click={togglePicker}>
                    {showPicker ? 'Hide Options' : 'Change Database File'}
                </button>
            </div>
            
            {#if showPicker}
                <div class="file-picker glass-panel">
                    {#if isLoadingFiles}
                        <p class="loading">Finding databases...</p>
                    {:else if availableFiles.length === 0}
                        <p class="empty">No other database files found.</p>
                    {:else}
                        <ul class="file-list">
                            {#each availableFiles as file}
                                <li>
                                    <button 
                                        class="file-option {file.id === spreadsheetId ? 'active' : ''}" 
                                        on:click={() => switchDatabase(file.id)}
                                        disabled={file.id === spreadsheetId}
                                    >
                                        <div class="file-info">
                                            <span class="fname">{file.name}</span>
                                            <span class="fmeta">Last modified: {new Date(file.modifiedTime).toLocaleDateString()}</span>
                                        </div>
                                        {#if file.id === spreadsheetId}
                                            <span class="check">✓</span>
                                        {/if}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/if}
        </div>

        <div class="field mt-4">
            <label for="sheetId">Spreadsheet ID</label>
            <input id="sheetId" type="text" value={spreadsheetId} disabled class="dimmed" />
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

    .input-group {
        display: flex;
        gap: 0.5rem;
    }
    
    .icon-btn {
        width: auto;
        padding: 0.75rem;
        background: rgba(255,255,255,0.1);
    }
    
    .dimmed {
        opacity: 0.6;
        font-size: 0.8rem;
    }
    
    .file-picker {
        margin-top: 1rem;
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .file-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .file-option {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: none;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        color: white;
        text-align: left;
    }
    
    .file-option:last-child {
        border-bottom: none;
    }
    
    .file-option:hover:not(:disabled) {
        background: rgba(255,255,255,0.05);
    }
    
    .file-option.active {
        background: rgba(52, 152, 219, 0.2);
    }
    
    .file-info {
        display: flex;
        flex-direction: column;
    }
    
    .fname { font-weight: 500; font-size: 0.9rem; }
    .fmeta { font-size: 0.75rem; color: #888; }
    
    .check {
        color: #2ecc71;
        font-weight: bold;
    }
    
    .picker-controls {
        margin-top: 0.5rem;
    }
    
    .secondary-btn.small {
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
        width: auto;
    }
    
    .mt-4 { margin-top: 1rem; }
    .loading, .empty { padding: 1rem; text-align: center; color: #888; }
</style>
