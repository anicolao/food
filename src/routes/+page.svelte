<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeAuth, signIn, signOut, getAccessToken } from '$lib/auth';
  import { fetchRows, ensureDataStructures } from '$lib/sheets';
  import { store, dispatchEvent, setConfig } from '$lib/store';
  import { base } from '$app/paths';
  import { resolveDriveImage } from '$lib/images';
  
  import StatsRing from '$lib/components/ui/StatsRing.svelte';
  import MacroBubble from '$lib/components/ui/MacroBubble.svelte';
  import FoodCard from '$lib/components/ui/FoodCard.svelte';

  let authenticated = $state(false);
  let stats = $state({ totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 });
  let allEntries: any[] = $state([]);
  const today = new Date().toISOString().split('T')[0];

  // Daily Goals (Mock for now, should be in settings/store)
  const GOALS = {
      calories: 2500,
      protein: 180,
      carbs: 250,
      fat: 80
  };

  async function syncData() {
        try {
            const { spreadsheetId, folderId } = await ensureDataStructures();
            store.dispatch(setConfig({ spreadsheetId, folderId }));

            const rows = await fetchRows(spreadsheetId, 'Events');
            rows.forEach(row => {
               if (row[2] && row[3]) {
                   const type = row[2];
                   try {
                       const payload = JSON.parse(row[3]);
                       store.dispatch(dispatchEvent(type, payload)); 
                   } catch (e) {}
               }
            });
        } catch (e) {
            console.error('Sync failed', e);
        }
  }

  onMount(() => {
    const existingToken = getAccessToken();
    if (existingToken) {
        authenticated = true;
        syncData();
    }

    initializeAuth((token) => {
      authenticated = !!token;
      if (authenticated) {
        syncData();
      }
    });

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.projections.stats[today]) {
        stats = state.projections.stats[today];
      } else {
        stats = { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
      }
      
      allEntries = [...state.projections.log].sort((a, b) => {
          const dateA = new Date(a.date + 'T' + a.time);
          const dateB = new Date(b.date + 'T' + b.time);
          return dateB.getTime() - dateA.getTime();
      });
    });

    return unsubscribe;
  });

  function handleSignIn() {
    signIn();
  }

  // Gallery Logic
  let showGallery = $state(false);
  let galleryImages: string[] = $state([]);

  // We can expose this function to children if needed, but FoodCard handles its own click -> navigation currently.
  // Except FoodCard wraps the whole thing in an anchor.
  // If we want a gallery, we might need to intercept clicks on the FoodCard thumbnail?
  // The implementations of FoodCard didn't expose an event for thumb click.
  // Actually FoodCard just has an anchor to /entry. Let's stick to that for now for simplicity.
  // The detail page handles gallery.
  // BUT the old dashboard had a gallery. 
  // Let's rely on the Detail page for gallery viewing to keep the Dashboard clean.
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
                    max={GOALS.calories} 
                    size={260} 
                    gradientId="calories-ring"
                    label="kcal"
                 />
             </div>
             
             <div class="macros-row">
                 <MacroBubble 
                    label="Protein" 
                    value={stats.totalProtein} 
                    max={GOALS.protein} 
                    color="#c471ed"
                    gradientId="protein-grad" 
                    iconSrc="/images/icon-protein.png" 
                />
                 <MacroBubble 
                    label="Carbs" 
                    value={stats.totalCarbs} 
                    max={GOALS.carbs} 
                    color="#24c6dc"
                    gradientId="carbs-grad" 
                    iconSrc="/images/icon-carbs.png" 
                />
                 <MacroBubble 
                    label="Fat" 
                    value={stats.totalFat} 
                    max={GOALS.fat} 
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
                <h2>Today's Logs</h2>
                <a href="{base}/log" class="text-link">Log New</a>
            </div>
            
            <div class="feed-list">
                {#if allEntries.length === 0}
                    <div class="empty-state">
                        <p>No food logged today.</p>
                    </div>
                {:else}
                    {#each allEntries as entry (entry.id)}
                        <FoodCard {...entry} />
                    {/each}
                {/if}
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
        margin-bottom: 16px;
    }

    .text-link {
        color: var(--color-primary);
        font-size: 0.9rem;
        font-weight: 500;
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
