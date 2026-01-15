<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeAuth, signIn, signOut, getAccessToken, authState } from '$lib/auth';
  import { fetchRows, ensureDataStructures } from '$lib/sheets';
  import { store, dispatchEvent, setConfig, appendEvent, processEvent, updateGoals } from '$lib/store';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { resolveDriveImage } from '$lib/images';
  import { getBusinessDate, groupLogs, type ActivityGroup } from '$lib/activity-grouping';
  
  import StatsRing from '$lib/components/ui/StatsRing.svelte';
  import MacroBubble from '$lib/components/ui/MacroBubble.svelte';
  import ActivityCard from '$lib/components/ui/ActivityCard.svelte';

  // Reactive State
  let authenticated = $state(false);
  let allLogs = $state<any[]>([]); // Synced from Redux
  let settings = $state(store.getState().settings);
  
  // Current Business Date (4AM cutoff)
  const today = getBusinessDate(new Date());
  
  // Reactive selected date state from URL
  let selectedDate = $derived($page.url.searchParams.get('date') || today);

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

  // Directional Transition Logic
  let lastDate = $state(selectedDate);
  let direction = $state<number>(0); // -1 (left), 1 (right)
  let manualDirection = 0; // Transient override for button clicks

  $effect.pre(() => {
      // Prioritize manual direction if set (button clicks)
      if (manualDirection !== 0) {
          direction = manualDirection;
          manualDirection = 0; // Consume
          lastDate = selectedDate; // Sync lastDate
      } else if (selectedDate !== lastDate) {
          // Fallback to date comparison (browser back/forward)
          const newD = new Date(selectedDate);
          const oldD = new Date(lastDate);
          direction = newD > oldD ? 1 : -1;
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
      manualDirection = -1; // Force "Past" direction
      const d = new Date(selectedDate + 'T12:00:00'); 
      d.setDate(d.getDate() - 1);
      setDate(toISOLocalDate(d));
  }

  function goToNextDay() {
      if (selectedDate === today) return;
      manualDirection = 1; // Force "Future" direction
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      setDate(toISOLocalDate(d));
  }
  
  function slideTransition(node: Element, { x = 0, duration = 300, easing = cubicOut }) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    return {
        duration,
        easing,
        css: (t: number, u: number) => `transform: ${transform} translateX(${u * x}%);`
    };
  }

  // Derived filtered logs
  let visibleLogs = $derived.by(() => {
     return allLogs.filter(entry => {
          const dateObj = new Date(`${entry.date}T${entry.time}`);
          return getBusinessDate(dateObj) === selectedDate;
      });
  });

  // Derived groups
  let groupedEntries = $derived(groupLogs(visibleLogs));

  // Derived stats
  let stats = $derived.by(() => {
      const newStats = { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
      visibleLogs.forEach(entry => {
          newStats.totalCalories += Number(entry.calories || 0);
          newStats.totalProtein += Number(entry.protein || 0);
          newStats.totalFat += Number(entry.fat || 0);
          newStats.totalCarbs += Number(entry.carbs || 0);
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

  async function syncData() {
        try {
            const { spreadsheetId, folderId } = await ensureDataStructures();
            store.dispatch(setConfig({ spreadsheetId, folderId }));

            const rows = await fetchRows(spreadsheetId, 'Events');
            rows.forEach(row => {
               // Expect: [eventId, timestamp, type, payloadJson]
               if (row[2] && row[3]) {
                   const type = row[2];
                   try {
                       const payload = JSON.parse(row[3]);
                       const event = {
                           eventId: row[0],
                           timestamp: row[1],
                           type,
                           payload
                       };
                       
                       // Replay to store WITHOUT side-effects (writing back to sheet)
                       store.dispatch(appendEvent(event));
                       store.dispatch(processEvent(event));
                       
                       if (type === 'settings/goalsUpdated') {
                           store.dispatch(updateGoals(payload));
                       }
                   } catch (e) {
                       console.error('Failed to parse event row', row, e);
                   }
               }
            });
        } catch (e) {
            console.error('Sync failed', e);
        }
  }

  onMount(() => {
      // Subscribe to auth state from store (initialized in Layout)
      const unsubAuth = authState.subscribe(state => {
          authenticated = !!state.token;
          if (authenticated) {
              syncData();
          }
      });
      // Trigger sync if already auth (e.g. from local storage restore)
      if (getAccessToken()) {
          authenticated = true;
          syncData();
      }

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      // Sync Redux -> Local State
      allLogs = state.projections.log;
      settings = state.settings;
    });

    return () => {
        unsubAuth();
        unsubscribe();
    };
  });

  function handleSignIn() {
    signIn();
  }

  $effect(() => {
      console.log('[CI-DEBUG] Dashboard base path:', base);
      console.log('[CI-DEBUG] Dashboard link href:', `${base}/log`);
      console.log('[CI-DEBUG] Dashboard authenticated:', authenticated);
  });
</script>

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
            <section class="stats-section glass-panel">
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
             
             <!-- SVG Gradients for Macros -->
             <svg width="0" height="0" class="visually-hidden">
                <defs>
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

        <!-- Right Col / Bottom Section: Feed -->
        <section class="feed-section">
            <div class="feed-header">
                <button class="nav-btn prev" onclick={() => goToPrevDay()} aria-label="Previous Day">
                    &lt;
                </button>
                <h2>{dateTitle}</h2>
                <button class="nav-btn next" onclick={() => goToNextDay()} disabled={selectedDate === today} aria-label="Next Day">
                    &gt;
                </button>
            </div>
            


            <div class="feed-list">
                {#key selectedDate}
                    <div 
                        in:slideTransition={{ x: direction * 100, duration: 300, easing: cubicOut }}
                        out:slideTransition={{ x: direction * -100, duration: 300, easing: cubicOut }}
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

    .stats-section {
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
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

    /* Desktop Layout */
    @media (min-width: 1024px) {
        .page-container {
            padding-bottom: 40px;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 40px;
            align-items: start;
        }
        
        .stats-section {
            position: sticky;
            top: 40px;
        }
    }
</style>
