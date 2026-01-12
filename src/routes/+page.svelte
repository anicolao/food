<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeAuth, signIn, signOut, getAccessToken } from '$lib/auth';
  import { fetchRows, ensureDataStructures } from '$lib/sheets';
  import { store, dispatchEvent, setConfig } from '$lib/store';

  let authenticated = false;
  let stats = { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
  let todaysEntries: any[] = [];
  const today = new Date().toISOString().split('T')[0];

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
            // Optionally initialize sheet headers if empty/error implies missing sheet content
        }
  }

  onMount(() => {
    const existingToken = getAccessToken();
    if (existingToken) {
        authenticated = true;
        // Don't sync immediately, wait for explicit token validity or just try
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
      // Filter entries for today
      todaysEntries = state.projections.log.filter(e => e.date === today);
    });

    return unsubscribe;
  });

  function handleSignIn() {
    signIn();
  }

  function handleSignOut() {
    signOut();
    authenticated = false;
    // Reset local state if needed
  }

  let showGallery = false;
  let galleryImages: string[] = [];

  function openGallery(images: string[]) {
      galleryImages = images;
      showGallery = true;
  }

  const imageCache = new Map<string, string>();
  
  async function resolveDriveImage(url: string): Promise<string> {
      if (!url) return '';
      if (imageCache.has(url)) return imageCache.get(url)!;

      // Check if it's a Drive URL we need to fetch authenticated
      // Pattern 1: constructed thumbnail link
      let fileId = '';
      const match1 = url.match(/id=([^&]+)/);
      if (match1) fileId = match1[1];
      
      // Pattern 2: direct file link (if we ever use that)
      // const match2 = url.match(/\/file\/d\/([^/]+)/);
      
      if (fileId) {
          const token = getAccessToken();
          if (token) {
              try {
                  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                      headers: { Authorization: `Bearer ${token}` }
                  });
                  if (res.ok) {
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      imageCache.set(url, blobUrl);
                      return blobUrl;
                  }
              } catch (e) {
                  console.error('Failed to fetch authenticated image', e);
              }
          }
      }
      
      // Fallback: return original (might work if public or cached) or failure
      return url;
  }
</script>

<div class="container">
  <p data-testid="debug-load">Debug: Loaded</p>
  <div class="header">
      <h1>Food Log</h1>
      {#if authenticated}
           <button class="sign-out-btn" on:click={handleSignOut}>Sign Out</button>
      {/if}
  </div>

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
      {#if todaysEntries.length === 0}
         <p>No entries yet.</p>
      {:else}
         <ul class="entry-list">
             {#each todaysEntries as entry}
                 <li class="entry-item">
                     <div class="entry-info">
                         <span class="time">{entry.time}</span>
                         <span class="meal-badge">{entry.mealType}</span>
                         <span class="desc">{entry.description}</span>
                     </div>
                     <div class="entry-meta">
                        <span class="cal">{entry.calories} kcal</span>
                        {#if entry.imageDriveUrl}
                            {@const imageUrls = entry.imageDriveUrl.split(',').map((u: string) => u.trim())}
                            <button class="thumb-btn" on:click={() => openGallery(imageUrls)}>
                                {#await resolveDriveImage(imageUrls[0])}
                                    <div class="thumb-loading"></div>
                                {:then src} 
                                    <img src={src} alt="Food" class="thumb" />
                                {:catch}
                                    <div class="thumb-error">!</div>
                                {/await}
                                
                                {#if imageUrls.length > 1}
                                    <span class="count-badge">+{imageUrls.length - 1}</span>
                                {/if}
                            </button>
                        {/if}
                     </div>
                 </li>
             {/each}
         </ul>
      {/if}
    </div>
  {/if}

  {#if showGallery}
      <div class="modal-backdrop" on:click={() => showGallery = false}>
          <div class="modal-content" on:click|stopPropagation>
              <button class="close-btn" on:click={() => showGallery = false}>&times;</button>
              <div class="gallery-scroll">
                  {#each galleryImages as imgUrl}
                      {#await resolveDriveImage(imgUrl)}
                           <div class="gallery-loading">Loading...</div>
                      {:then src}
                           <img src={src} alt="Gallery" class="gallery-img" />
                      {/await}
                  {/each}
              </div>
          </div>
      </div>
  {/if}
</div>

<style>
  .container { padding: 1rem; max-width: 600px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .sign-out-btn { padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; font-size: 0.8rem; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: #f5f5f5; padding: 1rem; border-radius: 8px; text-align: center; }
  .value { font-size: 1.5rem; font-weight: bold; display: block; }
  .actions { text-align: center; margin-bottom: 2rem; }
  .log-btn { background: #007bff; color: white; padding: 1rem 2rem; border-radius: 25px; text-decoration: none; font-weight: bold; }
  .entry-list { list-style: none; padding: 0; }
  .entry-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
  .entry-info { display: flex; flex-direction: column; gap: 0.2rem; }
  .entry-meta { display: flex; align-items: center; gap: 0.5rem; }
  .time { color: #666; font-size: 0.8rem; }
  .meal-badge { display: inline-block; background: #e9ecef; color: #495057; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; width: fit-content; }
  .cal { font-weight: bold; }
  
  .thumb-btn { position: relative; border: none; background: none; padding: 0; cursor: pointer; }
  .thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; border: 1px solid #ddd; }
  .count-badge { position: absolute; bottom: -5px; right: -5px; background: #007bff; color: white; font-size: 0.6rem; padding: 2px 4px; border-radius: 4px; font-weight: bold; }

  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; justify-content: center; align-items: center; }
  .modal-content { position: relative; width: 90%; max-width: 500px; background: black; padding: 1rem; border-radius: 8px; overflow: hidden; }
  .close-btn { position: absolute; top: 5px; right: 10px; background: none; border: none; color: white; font-size: 2rem; cursor: pointer; z-index: 1001; }
  .gallery-scroll { display: flex; overflow-x: auto; gap: 1rem; scroll-snap-type: x mandatory; padding-bottom: 10px; }
  .gallery-img { width: 100%; flex-shrink: 0; scroll-snap-align: center; border-radius: 4px; max-height: 70vh; object-fit: contain; }
</style>
