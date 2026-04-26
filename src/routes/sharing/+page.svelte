<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { store } from '$lib/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { cubicOut } from 'svelte/easing';
  import { getBusinessDate, groupLogs } from '$lib/activity-grouping';
  import { getAINutritionistFeedback, prepareFeedbackContext } from '$lib/gemini';
  import { base } from '$app/paths';
  import { slide } from 'svelte/transition';
  import { dispatchEvent } from '$lib/store';
  
  import StatsRing from '$lib/components/ui/StatsRing.svelte';
  import MacroBubble from '$lib/components/ui/MacroBubble.svelte';
  import HealthSummary from '$lib/components/ui/HealthSummary.svelte';
  import ActivityCard from '$lib/components/ui/ActivityCard.svelte';
  import NetworkStatus from '$lib/components/ui/NetworkStatus.svelte';
  import DashboardEMAs from '$lib/components/ui/DashboardEMAs.svelte';

  // Reactive State (Synced from Redux)
  let allLogs = $state<any[]>(store.getState().projections.log); 
  let statsProjection = $state(store.getState().projections.stats);
  let settings = $state(store.getState().settings);
  
  let isLoadingFeedback = $state(false);

  // Folders are managed by Layout, but let's just make sure we pass context safely
  const folderId = $page.url.searchParams.get('folderId');

  // Current Business Date (4AM cutoff)
  const today = getBusinessDate(new Date());
  
  // Reactive selected date state from URL
  let selectedDate = $derived($page.url.searchParams.get('date') || today);

  // Derived state for AI feedback from Redux store
  let aiFeedbackFromStore = $derived(statsProjection[selectedDate]?.aiFeedback);

  async function getFeedback() {
    isLoadingFeedback = true;
    try {
      const state = store.getState();
      const stats = state.projections.stats;

      const {
        last14DaysLogs,
        settingsSummary,
        emaSummary,
        recentFeedbacks
      } = prepareFeedbackContext(selectedDate, allLogs, settings, stats);

      const feedback = await getAINutritionistFeedback(last14DaysLogs, settings, settingsSummary, emaSummary, recentFeedbacks);
      
      // @ts-ignore
      store.dispatch(dispatchEvent('ai/feedbackGenerated', {
          date: selectedDate,
          feedback
      }));
    } catch (e) {
      console.error('Failed to get AI feedback', e);
    } finally {
      isLoadingFeedback = false;
    }
  }

  // Helper to format Date to YYYY-MM-DD (Local)
  function toISOLocalDate(d: Date) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }

  // Derived display title
  let dateTitle = $derived.by(() => {
      if (selectedDate === today) return 'Today';
      
      const sel = new Date(selectedDate + 'T00:00:00'); // Force local
      const now = new Date(today + 'T00:00:00'); // Force local
      const diffTime = now.getTime() - sel.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) return 'Yesterday';
      
      return sel.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  });

  // Manage collapsed state via URL
  let collapsedIds = $derived(($page.url.searchParams.get('collapsed') || '').split(',').filter(Boolean));

  function toggleGroup(id: string) {
      const newCollapsed = new Set(collapsedIds);
      if (newCollapsed.has(id)) {
          newCollapsed.delete(id);
      } else {
          newCollapsed.add(id);
      }
      
      const url = new URL($page.url);
      if (newCollapsed.size > 0) {
          url.searchParams.set('collapsed', Array.from(newCollapsed).join(','));
      } else {
          url.searchParams.delete('collapsed');
      }
      goto(url.toString(), { noScroll: true, keepFocus: true, replaceState: true });
  }

  function setDate(newDate: string) {
       const url = new URL($page.url);
       url.searchParams.set('date', newDate);
       url.searchParams.delete('collapsed'); 
       // Ensure folderId persists
       if (folderId) url.searchParams.set('folderId', folderId);
       
       goto(url.toString(), { noScroll: true, keepFocus: true });
  }

  function goToPrevDay() {
      const d = new Date(selectedDate + 'T12:00:00'); 
      d.setDate(d.getDate() - 1);
      setDate(toISOLocalDate(d));
  }

  function goToNextDay() {
      if (selectedDate === today) return;
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      setDate(toISOLocalDate(d));
  }
  
  function slideTransition(node: Element, { offset = 100, unit = '%', duration = 300, easing = cubicOut }) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    return {
        duration,
        easing,
        css: (t: number, u: number) => `transform: ${transform} translateX(${u * offset}${unit});`
    };
  }

  // Derived filtered logs
  let visibleLogs = $derived.by(() => {
      // Re-read logs from store explicitly?? 
      // Actually `allLogs` is reactive if updated in effect.
      return allLogs.filter(entry => {
           const dateObj = new Date(`${entry.date}T${entry.time}`);
           return getBusinessDate(dateObj) === selectedDate;
       });
  });

  // Derived groups
  let groupedEntries = $derived(groupLogs(visibleLogs));

  // Derived stats
  let stats = $derived.by(() => {
      const newStats = { 
          totalCalories: 0, 
          totalProtein: 0, 
          totalFat: 0, 
          totalCarbs: 0,
          totalFiber: 0,
          totalSugar: 0,
          totalAddedSugar: 0,
          totalSaturatedFat: 0,
          totalTransFat: 0,
          totalCholesterol: 0,
          totalSodium: 0
      };
      visibleLogs.forEach(entry => {
          newStats.totalCalories += Number(entry.calories || 0);
          newStats.totalProtein += Number(entry.protein || 0);
          newStats.totalFat += Number(entry.fat || 0);
          newStats.totalCarbs += Number(entry.carbs || 0);
          newStats.totalFiber += Number(entry.details?.fiber || 0);
          newStats.totalSugar += Number(entry.details?.sugar || 0);
          newStats.totalAddedSugar += Number(entry.details?.addedSugar || 0);
          newStats.totalSaturatedFat += Number(entry.details?.saturatedFat || 0);
          newStats.totalTransFat += Number(entry.details?.transFat || 0);
          newStats.totalCholesterol += Number(entry.details?.cholesterol || 0);
          newStats.totalSodium += Number(entry.details?.sodium || 0);
      });
      return newStats;
  });

  // Derived goals from settings
  let goals = $derived.by(() => {
    const { targetCalories, macroRatios } = settings;
    return {
        calories: targetCalories,
        protein: Math.round((targetCalories * macroRatios.protein) / 4),
        fat: Math.round((targetCalories * macroRatios.fat) / 9),
        carbs: Math.round((targetCalories * macroRatios.carbs) / 4)
    };
  });

  onMount(() => {
    // We assume Layout handles Hydration and Auth.
    // We just listen to Store updates.
    
    // Check if store already has data (SSR/Client mismatch prevention)
    allLogs = store.getState().projections.log;
    settings = store.getState().settings;
    statsProjection = store.getState().projections.stats;

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      allLogs = state.projections.log;
      settings = state.settings;
      statsProjection = state.projections.stats;
    });

    return () => {
        unsubscribe();
    };
  });

</script>

<div class="page-container" data-testid="sharing-page">
    <div class="header-bar">
        <h1>Shared Food Log</h1>
        <!-- Potentially show "Viewing X's Log" if we have metadata -->
    </div>

    <div class="dashboard-grid">
        <div class="left-col">
            <section class="stats-section glass-panel">
             <div class="status-positioner">
                 <NetworkStatus />
             </div>
             <div class="hero-ring">
                 <StatsRing 
                    value={stats.totalCalories} 
                    max={goals.calories}  
                    size={260} 
                    gradientId="calories-ring-share"
                    label="kcal"
                 />
             </div>
             
             <div class="macros-row">
                 <MacroBubble 
                    label="Protein" 
                    value={stats.totalProtein} 
                    max={goals.protein} 
                    color="#c471ed"
                    gradientId="protein-grad-share" 
                    iconSrc="/images/icon-protein.png" 
                />
                 <MacroBubble 
                    label="Carbs" 
                    value={stats.totalCarbs} 
                    max={goals.carbs} 
                    color="#24c6dc"
                    gradientId="carbs-grad-share" 
                    iconSrc="/images/icon-carbs.png" 
                />
                 <MacroBubble 
                    label="Fat" 
                    value={stats.totalFat} 
                    max={goals.fat} 
                    color="#D1913C" 
                    gradientId="fat-grad-share" 
                    iconSrc="/images/icon-fat.png" 
                />
             </div>
             
             <!-- SVG Gradients for Macros (Duplicate ID prevention with suffixes) -->
             <svg width="0" height="0" class="visually-hidden">
                <defs>
                    <linearGradient id="calories-ring-share" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#43e97b"/>
                        <stop offset="100%" stop-color="#38f9d7"/>
                    </linearGradient>
                    <linearGradient id="protein-grad-share" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#c471ed"/>
                        <stop offset="100%" stop-color="#f64f59"/>
                    </linearGradient>
                    <linearGradient id="carbs-grad-share" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#24c6dc"/>
                        <stop offset="100%" stop-color="#514a9d"/>
                    </linearGradient>
                    <linearGradient id="fat-grad-share" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#FFD194"/>
                        <stop offset="100%" stop-color="#D1913C"/>
                    </linearGradient>
                </defs>
             </svg>

             {#if settings.showHealthMetrics}
                <div class="health-summary-wrapper">
                    <HealthSummary 
                        {stats}
                        logs={visibleLogs}
                    />
                </div>
             {/if}
        </section>

        <section class="ai-analysis-card glass-panel" data-testid="ai-nutritionist-card">
            <div class="card-header">
                <h3>AI Nutritionist</h3>
                {#if aiFeedbackFromStore && !isLoadingFeedback}
                    <button class="text-btn" onclick={getFeedback}>Refresh</button>
                {/if}
            </div>
            
            {#if isLoadingFeedback}
                <div class="ai-loading">
                    <div class="spinner"></div>
                    <p>Consulting AI Nutritionist...</p>
                </div>
            {:else if aiFeedbackFromStore}
                <div class="ai-content" in:slide>
                    {@html aiFeedbackFromStore}
                </div>
            {:else}
                <div class="ai-prompt">
                    <p>Get personalized feedback based on your last 14 days of logs and trends.</p>
                    <button class="primary-btn full-width" onclick={getFeedback}>Get AI Feedback</button>
                </div>
            {/if}
        </section>

            <section class="ema-mobile-section glass-panel mobile-only">
                <DashboardEMAs {selectedDate} columns={2} />
            </section>
        </div>

        <div class="ema-desktop-wrapper glass-panel desktop-only">
            <DashboardEMAs {selectedDate} columns={2} />
        </div>

        <!-- Right Col / Bottom Section: Feed -->
        <section class="feed-section">
            <div class="feed-header">
                <button class="nav-btn prev" onclick={() => goToPrevDay()} aria-label="Previous Day">
                    &lt;
                </button>
                <div class="title-container">
                    {#key selectedDate}
                        <h2>
                            {dateTitle}
                        </h2>
                    {/key}
                </div>
                <button class="nav-btn next" onclick={() => goToNextDay()} disabled={selectedDate === today} aria-label="Next Day">
                    &gt;
                </button>
            </div>
            
            <div class="feed-list">
                {#key selectedDate}
                    <div class="slide-wrapper">
                        {#if groupedEntries.length === 0}
                            <div class="empty-state">
                                <p>No food logged for this day.</p>
                            </div>
                        {:else}
                            {#each groupedEntries as group (group.id)}
                                <ActivityCard 
                                    {group} 
                                    expanded={!collapsedIds.includes(group.id)}
                                    on:toggle={() => toggleGroup(group.id)} 
                                />
                            {/each}
                        {/if}
                    </div>
                {/key}
            </div>
        </section>
    </div>
</div>

<style>
    .page-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
        padding-bottom: 40px;
    }

    .header-bar {
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
    }
    
    .header-bar h1 {
        font-size: 1.5rem;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 700;
    }

    /* Reuse dashboard styles mostly */
    .dashboard-grid {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .stats-section {
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        position: relative;
        margin-bottom: 24px;
    }

    .status-positioner {
        position: absolute;
        top: 12px;
        right: 12px;
    }

    .hero-ring {
        margin-bottom: 30px;
    }

    .health-summary-wrapper {
        width: 100%;
        margin-top: 20px;
    }

    .macros-row {
        display: flex;
        justify-content: space-around;
        width: 100%;
        max-width: 400px;
    }

    /* AI Analysis Card */
    .ai-analysis-card {
        padding: 20px;
        margin-bottom: 24px;
    }

    .ai-analysis-card h3 {
        margin: 0;
        font-size: 1rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .text-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-weight: 600;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .ai-content {
        line-height: 1.6;
        color: var(--text-primary);
    }

    .ai-content :global(h4) {
        margin: 16px 0 8px 0;
        color: var(--color-primary);
    }

    .ai-content :global(ul) {
        padding-left: 20px;
        margin: 8px 0;
    }

    .ai-content :global(li) {
        margin-bottom: 4px;
    }

    .ai-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px 0;
        color: var(--text-secondary);
    }

    .ai-prompt {
        text-align: center;
        color: var(--text-secondary);
    }

    .full-width {
        width: 100%;
    }

    .primary-btn {
        background: var(--color-primary);
        color: white;
        padding: 12px 24px;
        border-radius: var(--radius-m);
        border: none;
        font-weight: 600;
        font-size: 1rem;
        margin-top: 20px;
        cursor: pointer;
    }

    .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .feed-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        background: rgba(255, 255, 255, 0.05);
        padding: 8px 16px;
        border-radius: 12px;
    }

    .title-container {
        flex: 1;
        text-align: center;
    }

    .feed-header h2 {
        font-size: 1.1rem;
        margin: 0;
        font-weight: 600;
    }

    .nav-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 4px 12px;
    }

    .nav-btn:hover:not(:disabled) {
        color: white;
    }

    .nav-btn:disabled {
         opacity: 0.3;
         cursor: not-allowed;
    }
    
    .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--text-muted);
        background: rgba(255,255,255,0.03);
        border-radius: var(--radius-m);
    }

    .ema-desktop-wrapper {
        margin-bottom: 24px;
        padding: 24px;
        min-height: 480px;
    }

    .ema-mobile-section {
        padding: 20px;
    }

    .desktop-only {
        display: none;
    }

    @media (max-width: 1023px) {
        .left-col {
            display: contents;
        }
        .stats-section {
            order: 1;
            margin-bottom: 0;
        }
        .ema-mobile-section {
            order: 2;
        }
        .feed-section {
            order: 3;
        }
    }

    /* Desktop Layout */
    @media (min-width: 1024px) {
        .desktop-only {
            display: block;
        }

        .mobile-only {
            display: none;
        }
        .dashboard-grid {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 40px;
            align-items: start;
        }

        .ema-desktop-wrapper, .feed-section {
            grid-column: 2;
        }
        
        .stats-section {
            position: sticky;
            top: 40px;
        }
    }

    @media (min-width: 1600px) {
        .page-container {
            max-width: 1800px;
        }
        .dashboard-grid {
            grid-template-columns: 350px 650px 1fr;
        }
        .ema-desktop-wrapper {
            grid-column: 2;
            position: sticky;
            top: 40px;
            margin-bottom: 0;
        }
        .feed-section {
            grid-column: 3;
        }
    }
</style>
