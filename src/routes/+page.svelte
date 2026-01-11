<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeAuth, signIn, getAccessToken } from '$lib/auth';
  import { fetchRows } from '$lib/sheets';
  import { store, dispatchEvent } from '$lib/store';

  let authenticated = false;
  let stats = { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
  const today = new Date().toISOString().split('T')[0];

  async function syncData() {
        try {
            const rows = await fetchRows('TODO_SPREADSHEET_ID', 'Events');
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

    // Subscribe to store updates
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.projections.stats[today]) {
        stats = state.projections.stats[today];
      }
    });

    return unsubscribe;
  });

  function handleSignIn() {
    signIn();
  }
</script>

<div class="container">
  <p data-testid="debug-load">Debug: Loaded</p>
  <h1>Food Log</h1>

  {#if !authenticated}
    <button on:click={handleSignIn}>Sign In with Google</button>
  {:else}
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Calories</h3>
        <span class="value">{stats.totalCalories}</span>
      </div>
      <div class="stat-card">
        <h3>Protein</h3>
        <span class="value">{stats.totalProtein}g</span>
      </div>
      <div class="stat-card">
        <h3>Carbs</h3>
        <span class="value">{stats.totalCarbs}g</span>
      </div>
      <div class="stat-card">
        <h3>Fat</h3>
        <span class="value">{stats.totalFat}g</span>
      </div>
    </div>
    
    <div class="actions">
      <a href="/log" class="log-btn">Log Food</a>
    </div>

    <div class="summary">
      <h2>Today's Summary</h2>
      <!-- Could list entries here -->
    </div>
  {/if}
</div>

<style>
  .container { padding: 1rem; max-width: 600px; margin: 0 auto; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: #f5f5f5; padding: 1rem; border-radius: 8px; text-align: center; }
  .value { font-size: 1.5rem; font-weight: bold; display: block; }
  .actions { text-align: center; margin-bottom: 2rem; }
  .log-btn { background: #007bff; color: white; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: bold; }
</style>
