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
    gap: 24px;
    width: 100%;
    max-width: 500px;
    padding: 20px;
  }

  .grid-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 160px;
    color: var(--text-primary, white);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08); /* Subtle border */
    border-radius: 24px; /* Larger radius */
    gap: 16px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
  }

  /* Glass/Sheen effect on hover */
  .grid-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
    transition: left 0.5s;
    pointer-events: none;
  }

  .grid-btn:hover::before {
    left: 100%;
  }

  .grid-btn:hover {
    transform: translateY(-4px) scale(1.02);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(255, 255, 255, 0.05);
  }

  .grid-btn:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.12);
  }

  .icon {
    font-size: 3rem;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2));
    transition: transform 0.3s;
  }
  
  .grid-btn:hover .icon {
    transform: scale(1.1);
  }

  span {
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    opacity: 0.9;
  }
</style>
