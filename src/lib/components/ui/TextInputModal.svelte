<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  
  let text = $state('');

  function close() {
    dispatch('close');
  }

  function analyze() {
    if (!text.trim()) return;
    dispatch('analyze', text);
  }
</script>

<div class="modal-backdrop" onclick={close} role="presentation">
    <div class="modal-content glass-panel" onclick={(e) => e.stopPropagation()} role="dialog">
        <h2>What did you eat?</h2>
        
        <textarea 
            bind:value={text} 
            placeholder="e.g., A large iced latte with oat milk and a blueberry muffin"
            rows="4"
            class="text-input"
            autofocus
        ></textarea>

        <div class="actions">
            <button class="secondary-btn" onclick={close}>Cancel</button>
            <button class="primary-btn neon-gradient" onclick={analyze} disabled={!text.trim()}>
                Analyze
            </button>
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
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .modal-content {
        width: 100%;
        max-width: 500px;
        background: var(--bg-card-glass, rgba(30, 30, 30, 0.9));
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-l, 24px);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    h2 {
        margin: 0;
        font-size: 1.5rem;
        color: white;
        text-align: center;
    }

    .text-input {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-m, 12px);
        color: white;
        padding: 16px;
        font-size: 1.1rem;
        width: 100%;
        resize: none;
        outline: none;
    }

    .text-input:focus {
        border-color: var(--color-primary, #4caf50);
        background: rgba(255, 255, 255, 0.08);
    }

    .actions {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
    }

    button {
        padding: 12px 24px;
        border-radius: 99px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        border: none;
        transition: transform 0.1s, opacity 0.2s;
    }

    button:active {
        transform: scale(0.96);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .secondary-btn {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .primary-btn {
        background: white;
        color: black;
    }
    
    .neon-gradient {
        background: linear-gradient(135deg, #00C6FF, #0072FF); /* Fallback/Example */
        color: white;
    }
</style>
