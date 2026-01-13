<script lang="ts">
  import type { ActivityGroup } from '$lib/activity-grouping';
  import { base } from '$app/paths';
  import { resolveDriveImage } from '$lib/images';
  
  // Props
  export let group: ActivityGroup;

  let expanded = true;

  function toggle() {
    expanded = !expanded;
  }

  function getMainImage(urlStr?: string) {
      if (!urlStr) return null;
      const urls = urlStr.split(',').map(u => u.trim());
      return urls.length > 0 ? urls[0] : null;
  }
</script>

<div class="activity-card glass-panel">
  <!-- Header / Summary Row -->
  <button class="header-btn" onclick={toggle} aria-expanded={expanded}>
    <div class="left-col">
        <h3>{group.title}</h3>
        <span class="time-range">
            {group.startTime} 
            {#if group.endTime !== group.startTime} - {group.endTime}{/if}
        </span>
    </div>

    <div class="right-col">
        <span class="total-cals">{group.calories} <span class="unit">kcal</span></span>
        <div class="mini-macros">
            <span class="macro p">{Math.round(group.protein)}p</span>
            <span class="macro c">{Math.round(group.carbs)}c</span>
            <span class="macro f">{Math.round(group.fat)}f</span>
        </div>
    </div>
  </button>

  {#if expanded}
    <div class="details-list">
        {#each group.items as item}
            {@const mainImage = getMainImage(item.imageDriveUrl)}
            <a href="{base}/entry?id={item.id}" class="item-row">
                <div class="item-visual">
                    {#if mainImage}
                        {#await resolveDriveImage(mainImage)}
                            <div class="skel-img"></div>
                        {:then src}
                            <img src={src} alt={item.description} class="thumb" />
                        {:catch}
                            <div class="fallback-img">?</div>
                        {/await}
                    {:else}
                        <div class="fallback-img">{item.mealType[0]}</div>
                    {/if}
                </div>

                <div class="item-info">
                    <div class="item-name">{item.description}</div>
                    <div class="item-stats">
                        {#if item.calories}
                            <span class="item-cal">{item.calories} kcal</span>
                        {/if}
                    </div>
                </div>
            </a>
        {/each}
        <div class="add-more-hint">
            <!-- Optional: Link to add more to this meal? -->
        </div>
    </div>
  {/if}
</div>

<style>
  .activity-card {
    background: var(--bg-card-glass, rgba(28, 30, 36, 0.7));
    backdrop-filter: blur(12px);
    border-radius: 20px;
    margin-bottom: 16px;
    overflow: hidden;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
  }

  .header-btn {
    width: 100%;
    background: none;
    border: none;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .left-col h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .time-range {
    font-size: 0.85rem;
    color: var(--text-secondary, #a0a0a0);
    margin-top: 4px;
    display: block;
  }

  .right-col {
    text-align: right;
  }

  .total-cals {
    display: block;
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text-accent, #ff9966); /* Orange default */
    /* Neon glow could go here */
  }
  
  .unit {
      font-size: 0.8rem;
      font-weight: 400;
      color: var(--text-secondary);
  }

  .mini-macros {
      margin-top: 4px;
      font-size: 0.75rem;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      opacity: 0.8;
  }
  
  .macro.p { color: #c471ed; }
  .macro.c { color: #24c6dc; }
  .macro.f { color: #D1913C; }

  /* Details */
  .details-list {
      border-top: 1px solid rgba(255,255,255,0.05);
      background: rgba(0,0,0,0.1);
  }

  .item-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 0.95rem;
      border-bottom: 1px solid rgba(255,255,255,0.02);
      transition: background 0.2s;
  }

  .item-row:last-child {
      border-bottom: none;
  }

  .item-row:hover {
      background: rgba(255,255,255,0.05);
      color: white;
  }

  /* Image Area */
  .item-visual {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: #2a2a2a;
  }

  .thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
  }

  .skel-img {
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.05);
      animation: pulse 1.5s infinite;
  }

  .fallback-img {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: var(--text-muted);
      background: rgba(255,255,255,0.03);
  }

  .item-info {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .item-name {
      font-weight: 500;
      color: var(--text-primary, #fff);
  }

  .item-cal {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 600;
  }

  @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
  }
</style>
