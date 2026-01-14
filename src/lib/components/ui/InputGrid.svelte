<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function selectMode(mode: 'CAMERA' | 'LIBRARY' | 'VOICE' | 'TEXT') {
    dispatch('select', mode);
  }
</script>

<div class="input-grid">
  <button class="grid-btn glass-panel" onclick={() => selectMode('CAMERA')}>
    <div class="icon">📷</div>
    <span>Camera</span>
  </button>
  
  <button class="grid-btn glass-panel" onclick={() => selectMode('LIBRARY')}>
    <div class="icon">🖼️</div>
    <span>Library</span>
  </button>
  
  <button class="grid-btn glass-panel" onclick={() => selectMode('VOICE')}>
    <div class="icon">mic</div>
    <span>Voice</span>
  </button>
  
  <button class="grid-btn glass-panel" onclick={() => selectMode('TEXT')}>
    <div class="icon">edit</div>
    <span>Text</span>
  </button>
</div>

<style>
  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 20px;
    width: 100%;
    max-width: 500px;
    padding: 20px;
  }

  .grid-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 140px; /* Slightly taller for better touch targets */
    color: var(--text-primary, white);
    background: var(--bg-card-glass, rgba(255, 255, 255, 0.1));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-m, 16px);
    gap: 12px;
    transition: transform 0.2s, background 0.2s;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .grid-btn:active {
    transform: scale(0.96);
    background: rgba(255, 255, 255, 0.15);
  }

  .icon {
    font-size: 2.5rem;
    /* Use material symbols if available, or emoji fallback */
    font-family: 'Material Symbols Outlined', sans-serif; 
  }

  /* Fallback for icon font if not loaded */
  .icon {
      font-style: normal;
  }
</style>
