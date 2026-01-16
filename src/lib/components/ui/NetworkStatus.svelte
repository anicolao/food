<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { getPendingEvents } from '$lib/db';
   import { syncManager } from '$lib/sync-manager';
   import { base } from '$app/paths';
   import { goto } from '$app/navigation';
   
   // We can poll or listen to events. For now, simple polling for pending count + online API
   let isOnline = true;
   let pendingCount = 0;
   let isSyncing = false;
   let interval: any;

   async function checkStatus() {
       isOnline = navigator.onLine;
       isSyncing = syncManager.isSyncing;
       const pending = await getPendingEvents();
       pendingCount = pending.length;
   }

   onMount(() => {
       isOnline = navigator.onLine;
       window.addEventListener('online', checkStatus);
       window.addEventListener('offline', checkStatus);
       
       interval = setInterval(checkStatus, 2000); // Poll every 2s
       checkStatus();
   });

   onDestroy(() => {
    if (typeof window !== 'undefined') {
       window.removeEventListener('online', checkStatus);
       window.removeEventListener('offline', checkStatus);
       clearInterval(interval);
    }
   });

   function handleClick() {
       goto(`${base}/settings/network`);
   }
</script>

<button 
    class="network-status" 
    class:offline={!isOnline} 
    on:click={handleClick}
    aria-label="Network Status: {isOnline ? 'Online' : 'Offline'}, {pendingCount} pending items"
    data-status={!isOnline ? 'offline' : (isSyncing ? 'syncing' : (pendingCount > 0 ? 'pending' : 'synced'))}
>
    <div class="icon-wrapper">
        {#if !isOnline}
            <!-- Cloud Off -->
            <img src="{base}/images/icon-status-offline.png" alt="Offline" width="24" height="24" />
        {:else if isSyncing}
            <!-- Syncing -->
            <img src="{base}/images/icon-status-syncing.png" alt="Syncing" width="24" height="24" class="animate-pulse" />
        {:else if pendingCount > 0}
             <!-- Pending -->
             <img src="{base}/images/icon-status-pending.png" alt="Pending" width="24" height="24" />
             <span class="badge">{pendingCount}</span>
        {:else}
            <!-- Synced -->
            <img src="{base}/images/icon-status-synced.png" alt="Synced" width="24" height="24" />
        {/if}
    </div>
</button>

<style>
    .network-status {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 8px;
        transition: transform 0.2s;
    }

    .network-status:active {
        transform: scale(0.95);
    }
    
    .icon-wrapper {
        display: flex;
        align-items: center;
        position: relative;
    }

    img {
        display: block;
        filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
    }
    
    .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: .5; }
    }

    .badge {
        position: absolute;
        top: -5px;
        right: -8px;
        font-size: 0.75rem;
        background: var(--primary-color, #3498db);
        color: white;
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
        min-width: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
</style>
