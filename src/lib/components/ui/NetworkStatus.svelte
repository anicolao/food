<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { getPendingEvents } from '$lib/db';
   import { syncManager } from '$lib/sync-manager';
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
       goto('/settings/network');
   }
</script>

<button 
    class="network-status" 
    class:offline={!isOnline} 
    on:click={handleClick}
    aria-label="Network Status: {isOnline ? 'Online' : 'Offline'}, {pendingCount} pending items"
>
    {#if !isOnline}
        <!-- Cloud Off -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 7h1.8a5 5 0 0 0 .8 8.65"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    {:else if isSyncing}
        <!-- Syncing (Cloud Upload with animation?) -->
        <svg class="animate-pulse" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
    {:else if pendingCount > 0}
         <!-- Pending (Cloud with dot?) using Cloud for now -->
         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/><path d="M21 16h-1.26a8 8 0 1 0-11.62 9"/><path d="M23 19a6 6 0 0 0-6-6"/></svg>
         <span class="badge">{pendingCount}</span>
    {:else}
        <!-- Synced (Cloud Check) -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/><path d="M20 20v-4h-4"/><path d="M4 4v4h4"/><path d="M22 2a20 20 0 0 0-20 20"/><path d="M2 22a20 20 0 0 0 20-20"/></svg>
    {/if}
</button>

<style>
    .network-status {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-secondary, #666);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background-color 0.2s;
    }

    .network-status:hover {
        background-color: rgba(0,0,0,0.05);
    }

    .network-status.offline {
        color: var(--error-color, #e74c3c);
    }
    
    .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: .5; }
    }

    .badge {
        font-size: 0.75rem;
        background: var(--primary-color, #3498db);
        color: white;
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
        min-width: 1rem;
    }
</style>
