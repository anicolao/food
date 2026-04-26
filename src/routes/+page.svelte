<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeAuth, signIn, signOut, ensureValidToken, authState } from '$lib/auth';

  import { store, dispatchEvent } from '$lib/store';
  import { syncManager } from '$lib/sync-manager';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { resolveDriveImage } from '$lib/images';
  import { getBusinessDate, groupLogs, type ActivityGroup } from '$lib/activity-grouping';
  import { getAINutritionistFeedback, prepareFeedbackContext } from '$lib/gemini';
  import { getMetricEMASeries, getDatesRange } from '$lib/metrics';
  
  import StatsRing from '$lib/components/ui/StatsRing.svelte';
  import MacroBubble from '$lib/components/ui/MacroBubble.svelte';
  import HealthSummary from '$lib/components/ui/HealthSummary.svelte';
  import ActivityCard from '$lib/components/ui/ActivityCard.svelte';
  import NetworkStatus from '$lib/components/ui/NetworkStatus.svelte';
  import DashboardEMAs from '$lib/components/ui/DashboardEMAs.svelte';
  import { slide } from 'svelte/transition';

  // Reactive State
  let authenticated = $state(false);
  let allLogs = $state<any[]>(store.getState().projections.log); // Synced from Redux
  let statsProjection = $state(store.getState().projections.stats);
  let settings = $state(store.getState().settings);
  let showEMAs = $state(false);
  let flipRotation = $state(0);
  let innerWidth = $state(0);

  let isLoadingFeedback = $state(false);

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

  $effect(() => {
    if (innerWidth >= 1024) {
      showEMAs = false;
      flipRotation = 0;
    }
  });
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

  // Directional Transition Logic
  let lastDate = $state(selectedDate);
  let direction = $state<number>(0); // -1 (left), 1 (right)

  $effect.pre(() => {
      // Fallback for browser navigation (if direction wasn't set by buttons)
      if (selectedDate !== lastDate) {
          const newD = new Date(selectedDate);
          const oldD = new Date(lastDate);
          const calcDir = newD > oldD ? 1 : -1;
          
          // Only update if not already set correctly (avoids redundant updates)
          if (direction !== calcDir) {
               direction = calcDir;
          }
          lastDate = selectedDate;
      }
  });

  function setDate(newDate: string) {
       const url = new URL($page.url);
       url.searchParams.set('date', newDate);
       url.searchParams.delete('collapsed'); 
       
       goto(url.toString(), { noScroll: true, keepFocus: true });
  }

  function goToPrevDay() {
      direction = -1; // Sync update before nav
      const d = new Date(selectedDate + 'T12:00:00'); 
      d.setDate(d.getDate() - 1);
      setDate(toISOLocalDate(d));
  }

  function goToNextDay() {
      if (selectedDate === today) return;
      direction = 1; // Sync update before nav
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      setDate(toISOLocalDate(d));
  }
  
  function slideTransition(node: Element, { offset = 100, unit = '%', duration = 300, easing = cubicOut }) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    // Capture the *current* direction when the transition starts
    const x = direction * offset;
    return {
        duration,
        easing,
        css: (t: number, u: number) => `transform: ${transform} translateX(${u * x}${unit});`
    };
  }

  // Derived filtered logs
  let visibleLogs = $derived.by(() => {
      return allLogs.filter(entry => {
           const dateObj = new Date(`${entry.date}T${entry.time}`);
           // Use business date logic to match dashboard day
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
      // Subscribe to auth state from store (initialized in Layout)
      const unsubAuth = authState.subscribe(state => {
          authenticated = !!state.token;
          if (authenticated) {
              syncManager.sync();
          }
      });
      // Trigger sync if already auth (e.g. from local storage restore)
      ensureValidToken().then(token => {
          if (token) {
              authenticated = true;
              syncManager.sync(); // This is async but we don't await it here to avoid blocking
          }
      });

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      // Sync Redux -> Local State
      allLogs = state.projections.log;
      settings = state.settings;
      statsProjection = state.projections.stats;
    });

    return () => {
        unsubAuth();
        unsubscribe();
    };
  });

  function handleSignIn() {
    signIn();
  }
</script>

<svelte:window bind:innerWidth />

<div class="page-container" data-testid="debug-load">
  
  {#if !authenticated}
    <div class="auth-hero">
        <h1>Welcome Back</h1>
        <p>Sign in to track your nutrition.</p>
        <button class="primary-btn" onclick={handleSignIn}>Sign In with Google</button>
    </div>
  {:else}
    <div class="dashboard-grid">
        <div class="left-col">
            <div class="flip-card" class:flipped={showEMAs}>
                <div class="status-positioner">
                    <NetworkStatus />
                </div>
                <div class="flip-card-inner" style="transform: rotateY({flipRotation}deg)">
                    <!-- Front Side: Rings and Macros -->
                    <div class="flip-card-front">
                        <section class="stats-section glass-panel">
                            <button 
                                class="flip-toggle-btn mobile-only" 
                                onclick={() => { showEMAs = true; flipRotation -= 180; }}
                                aria-label="Show Trends"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                </svg>
                            </button>

                            <div class="hero-ring">
                                <StatsRing 
                                    value={stats.totalCalories} 
                                    max={goals.calories}  
                                    size={260} 
                                    gradientId="calories-ring"
                                    label="kcal"
                                />
                            </div>
                            
                            <div class="macros-row">
                                <MacroBubble 
                                    label="Protein" 
                                    value={stats.totalProtein} 
                                    max={goals.protein} 
                                    color="#c471ed"
                                    gradientId="protein-grad" 
                                    iconSrc="/images/icon-protein.png" 
                                />
                                <MacroBubble 
                                    label="Carbs" 
                                    value={stats.totalCarbs} 
                                    max={goals.carbs} 
                                    color="#24c6dc"
                                    gradientId="carbs-grad" 
                                    iconSrc="/images/icon-carbs.png" 
                                />
                                <MacroBubble 
                                    label="Fat" 
                                    value={stats.totalFat} 
                                    max={goals.fat} 
                                    color="#D1913C" 
                                    gradientId="fat-grad" 
                                    iconSrc="/images/icon-fat.png" 
                                />
                            </div>
                            
                            {#if settings.showHealthMetrics}
                                <HealthSummary 
                                    {stats}
                                    logs={visibleLogs}
                                />
                            {/if}
                            
                            <!-- SVG Gradients for Macros -->
                            <svg width="0" height="0" class="visually-hidden">
                                <defs>
                                    <linearGradient id="calories-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#43e97b"/>
                                        <stop offset="100%" stop-color="#38f9d7"/>
                                    </linearGradient>
                                    <linearGradient id="protein-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#c471ed"/>
                                        <stop offset="100%" stop-color="#f64f59"/>
                                    </linearGradient>
                                    <linearGradient id="carbs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#24c6dc"/>
                                        <stop offset="100%" stop-color="#514a9d"/>
                                    </linearGradient>
                                    <linearGradient id="fat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#FFD194"/>
                                        <stop offset="100%" stop-color="#D1913C"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </section>
                    </div>

                    <!-- Back Side: EMA Graphs -->
                    <div class="flip-card-back">
                        <section class="stats-section glass-panel">
                            <button 
                                class="flip-toggle-btn back mobile-only" 
                                onclick={() => { showEMAs = false; flipRotation -= 180; }}
                                aria-label="Show Stats"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="6"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                </svg>
                            </button>
                            <div class="ema-mobile-content">
                                <DashboardEMAs {selectedDate} columns={2} />
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <section class="ai-analysis-card glass-panel">
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
                        <h2
                            in:slideTransition={{ offset: 50, unit: 'vw', duration: 300, easing: cubicOut }}
                            out:slideTransition={{ offset: -50, unit: 'vw', duration: 300, easing: cubicOut }}
                        >
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
                    <div 
                        in:slideTransition={{ offset: 100, duration: 300, easing: cubicOut }}
                        out:slideTransition={{ offset: -100, duration: 300, easing: cubicOut }}
                        class="slide-wrapper"
                    >
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
  {/if}

</div>

<style>
    .page-container {
        padding: var(--pad-page);
        max-width: 1200px;
        margin: 0 auto;
        padding-bottom: 120px; /* Mobile nav clearance */
    }

    .auth-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60vh;
        text-align: center;
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
    }

    .dashboard-grid {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    /* Flip Card Styles */
    .flip-card {
        background-color: transparent;
        width: 100%;
        perspective: 1000px;
        margin-bottom: 24px;
        position: relative;
    }

    .flip-card-inner {
        position: relative;
        width: 100%;
        text-align: center;
        transition: transform 0.6s;
        transform-style: preserve-3d;
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: 1fr;
    }

    .flip-card-front, .flip-card-back {
        grid-area: 1 / 1;
        width: 100%;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        border-radius: 24px;
        transform: translateZ(0);
        display: flex;
        flex-direction: column;
    }

    .flip-card-back {
        transform: rotateY(-180deg);
    }

    .flip-toggle-btn {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 10;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: var(--text-secondary);
        padding: 8px;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .flip-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }

    .flip-toggle-btn.back {
        left: 12px;
        right: auto;
    }

    .ema-mobile-content {
        padding-top: 40px;
        width: 100%;
    }

    .stats-section {
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        position: relative;
        min-height: 480px;
    }

    @media (max-width: 1023px) {
        .stats-section {
            overflow: visible;
        }
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
        margin-bottom: 12px;
    }

    .text-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
    }

    .ai-prompt {
        display: flex;
        flex-direction: column;
        gap: 12px;
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .full-width {
        width: 100%;
    }

    .ai-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px 0;
        color: var(--text-muted);
    }

    .ai-content {
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--text-secondary);
    }

    .ai-content :global(p) {
        margin-bottom: 12px;
    }

    .ai-content :global(ul) {
        margin-bottom: 12px;
        padding-left: 20px;
    }

    .ai-content :global(li) {
        margin-bottom: 4px;
    }

    .ai-content :global(strong) {
        color: white;
    }

    .ai-content :global(h4) {
        margin: 16px 0 8px 0;
        color: white;
        font-size: 1rem;
    }

    .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        border-top-color: var(--color-primary);
        animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .status-positioner {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 20;
    }

    .hero-ring {
        margin-bottom: 30px;
    }

    .macros-row {
        display: flex;
        justify-content: space-around;
        width: 100%;
        max-width: 400px;
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
        display: grid;
        grid-template-areas: "stack";
        overflow: hidden;
        flex: 1;
        justify-items: center;
        align-items: center;
    }

    .feed-header h2 {
        grid-area: stack;
        font-size: 1.1rem;
        margin: 0;
        font-weight: 600;
        white-space: nowrap;
    }

    .nav-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 4px 12px;
        transition: color 0.2s;
    }

    .nav-btn:hover:not(:disabled) {
        color: white;
    }

    .nav-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .feed-list {
        display: grid;
        grid-template-areas: "stack";
        overflow-x: hidden;
    }

    .slide-wrapper {
        grid-area: stack;
        width: 100%;
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

    .desktop-only {
        display: none;
    }

    @media (max-width: 1023px) {
        .left-col {
            display: contents;
        }
        .flip-card {
            order: 1;
            margin-bottom: 0;
        }
        .feed-section {
            order: 2;
        }
        .ai-analysis-card {
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

        .page-container {
            padding-bottom: 40px;
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
        
        .left-col {
            position: sticky;
            top: 40px;
        }

        .flip-card {
            transform: none !important;
            perspective: none;
        }
        
        .flip-card-inner {
            transform: none !important;
            transform-style: flat;
            display: block;
        }

        .flip-card-back {
            display: none;
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
