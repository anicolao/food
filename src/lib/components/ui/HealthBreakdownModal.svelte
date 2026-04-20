<script lang="ts">
    import { fade, fly } from 'svelte/transition';

    interface Props {
        title: string;
        logs: any[];
        nutrientKey: string;
        unit: string;
        onclose: () => void;
    }

    let { title, logs, nutrientKey, unit, onclose }: Props = $props();

    // Filter logs that have the nutrient and sort by amount descending
    const filteredLogs = $derived(
        logs
            .map(log => ({
                name: log.name || 'Unnamed Entry',
                amount: Number(log.details?.[nutrientKey] || 0)
            }))
            .filter(item => item.amount > 0)
            .sort((a, b) => b.amount - a.amount)
    );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose} role="presentation" transition:fade={{ duration: 200 }}>
    <div 
        class="modal-content glass-panel" 
        onclick={(e) => e.stopPropagation()} 
        role="dialog"
        transition:fly={{ y: 20, duration: 300 }}
    >
        <div class="header">
            <h2>{title} Breakdown</h2>
            <button class="close-btn" onclick={onclose} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        
        <div class="list">
            {#if filteredLogs.length === 0}
                <div class="empty-state">
                    <p>No {title.toLowerCase()} recorded for this day.</p>
                </div>
            {:else}
                {#each filteredLogs as item}
                    <div class="item">
                        <span class="name">{item.name}</span>
                        <div class="amount-badge">
                            <span class="amount">{Math.round(item.amount)}</span>
                            <span class="unit">{unit}</span>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="actions">
            <button class="primary-btn" onclick={onclose}>Close</button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .modal-content {
        width: 100%;
        max-width: 450px;
        background: rgba(30, 30, 30, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 28px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h2 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: white;
    }

    .close-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s, color 0.2s;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 400px;
        overflow-y: auto;
        padding-right: 4px;
    }

    /* Custom scrollbar */
    .list::-webkit-scrollbar {
        width: 6px;
    }
    .list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
    }
    .list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }

    .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .name {
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 12px;
    }

    .amount-badge {
        display: flex;
        align-items: baseline;
        gap: 2px;
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 10px;
        border-radius: 12px;
        flex-shrink: 0;
    }

    .amount {
        font-weight: 700;
        color: white;
        font-size: 1rem;
    }

    .unit {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 600;
    }

    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.4);
    }

    .actions {
        margin-top: 10px;
    }

    .primary-btn {
        width: 100%;
        padding: 14px;
        border-radius: 16px;
        background: white;
        color: black;
        border: none;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.1s, background 0.2s;
    }

    .primary-btn:active {
        transform: scale(0.98);
    }

    .primary-btn:hover {
        background: rgba(255, 255, 255, 0.9);
    }
</style>
