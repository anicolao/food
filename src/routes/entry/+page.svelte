<script lang="ts">
  import { page } from '$app/stores';
  import { store, dispatchEvent } from '$lib/store';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { getAccessToken } from '$lib/auth';
  import { appendRow } from '$lib/sheets';
  import { formatLogDate } from '$lib/formatDate';

  // Changed: Get ID from query params
  const id = $page.url.searchParams.get('id');
  
  let entry: any = null;
  let form: any = {
      mealType: 'Snack',
      description: '',
      rationale: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
  };
  
  let imageUrls: string[] = [];
  let entryDateTimeStr = '';

  onMount(() => {
      if (!id) {
          console.error("No ID provided in query params");
          goto(`${base}/`);
          return;
      }

      const state = store.getState();
      entry = state.projections.log.find(e => e.id === id);
      
      if (!entry) {
          alert('Entry not found');
          goto(`${base}/`);
          return;
      }

      // Populate form
      form = {
          mealType: entry.mealType,
          description: entry.description,
          rationale: entry.rationale || '',
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat
      };
      
      if (entry.imageDriveUrl) {
          imageUrls = entry.imageDriveUrl.split(',').map((u: string) => u.trim());
      }
      
      entryDateTimeStr = formatLogDate(entry.date + 'T' + entry.time);
  });

  async function handleSave() {
     if (!entry || !id) return;

     const changes = {
         mealType: form.mealType,
         description: form.description,
         rationale: form.rationale, // Allow editing rationale manually if desired
         calories: Number(form.calories),
         protein: Number(form.protein),
         carbs: Number(form.carbs),
         fat: Number(form.fat)
     };

     store.dispatch(dispatchEvent('log/entryUpdated', { entryId: id, changes }));
     
     // Sync to Sheets (Append update event)
     try {
        const state = store.getState();
        // @ts-ignore
        const spreadsheetId = state.config?.spreadsheetId;
        if (spreadsheetId) {
             await appendRow(spreadsheetId, 'Events', [
                crypto.randomUUID(),
                new Date().toISOString(),
                'log/entryUpdated',
                JSON.stringify({ entryId: id, changes })
            ]);
        }
     } catch(e) { console.error('Sheet sync failed', e); }

     goto(`${base}/`);
  }

  async function handleDelete() {
      if (!confirm('Are you sure you want to delete this entry?')) return;
      if (!id) return;
      
      store.dispatch(dispatchEvent('log/entryDeleted', { entryId: id }));

      // Sync to Sheets
      try {
        const state = store.getState();
        // @ts-ignore
        const spreadsheetId = state.config?.spreadsheetId;
        if (spreadsheetId) {
             await appendRow(spreadsheetId, 'Events', [
                crypto.randomUUID(),
                new Date().toISOString(),
                'log/entryDeleted',
                JSON.stringify({ entryId: id })
            ]);
        }
     } catch(e) { console.error('Sheet sync failed', e); }

      goto(`${base}/`);
  }
  
  // Image Resolution (Copied from home page - ideally refactor to util)
  const imageCache = new Map<string, string>();
  async function resolveDriveImage(url: string): Promise<string> {
      if (!url) return '';
      if (imageCache.has(url)) return imageCache.get(url)!;

      let fileId = '';
      const match1 = url.match(/id=([^&]+)/);
      if (match1) fileId = match1[1];
      
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
              } catch (e) { console.error('Failed to fetch image', e); }
          }
      }
      return url;
  }
  let galleryContainer: HTMLElement;

  function handleGalleryClick(e: MouseEvent) {
      if (!galleryContainer) return;

      const rect = galleryContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const center = rect.width / 2;
      
      // Calculate scroll amount: ~85% of width + gap (approx) or just generic "page"
      // Since it's scroll-snap, approximate scroll usually snaps to correct point.
      const scrollAmount = rect.width * 0.85; 

      if (x > center) {
          galleryContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
          galleryContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
  }
</script>

<div class="container">
  <div class="nav-header">
      <a href="{base}/" class="back-link">&larr; Back</a>
      <span>{entryDateTimeStr}</span>
      <button class="delete-btn" on:click={handleDelete}>Delete</button>
  </div>

  {#if imageUrls.length > 0}
      <!-- svelte-ignore a11y-click-events-have-key-events(we just want enhancement, scrolling works naturally too) -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="gallery" bind:this={galleryContainer} on:click={handleGalleryClick}>
          {#each imageUrls as url}
               {#await resolveDriveImage(url)}
                   <div class="loading-placeholder">Loading...</div>
               {:then src}
                   <img src={src} class="hero-image" alt="Food" />
               {:catch}
                   <div class="error-placeholder">Image Error</div>
               {/await}
          {/each}
      </div>
  {/if}

  <div class="form-section">
      <label>Item Name <input type="text" bind:value={form.description} /></label>
      
      <label>Meal Type
        <select bind:value={form.mealType}>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
          <option>Snack</option>
        </select>
      </label>

      <div class="macros">
        <label>Calories <input type="number" bind:value={form.calories} /></label>
        <label>Protein (g) <input type="number" bind:value={form.protein} /></label>
        <label>Carbs (g) <input type="number" bind:value={form.carbs} /></label>
        <label>Fat (g) <input type="number" bind:value={form.fat} /></label>
      </div>

      <label>Rationale / Notes <textarea bind:value={form.rationale} rows="4"></textarea></label>

      <button class="save-btn" on:click={handleSave}>Save Changes</button>
  </div>
</div>

<style>
  .container { padding: 1rem; max-width: 600px; margin: 0 auto; }
  .nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .back-link { text-decoration: none; color: #007bff; font-weight: bold; }
  .delete-btn { background: none; color: #dc3545; border: 1px solid #dc3545; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; }
  
  .gallery { display: flex; overflow-x: auto; gap: 1rem; margin-bottom: 1.5rem; scroll-snap-type: x mandatory; }
  .hero-image { width: 85%; height: 300px; object-fit: cover; border-radius: 8px; flex-shrink: 0; scroll-snap-align: center; }
  .loading-placeholder, .error-placeholder { width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background: #eee; border-radius: 8px; }
  
  label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
  input, select, textarea { width: 100%; padding: 0.8rem; margin-bottom: 1.2rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
  .macros { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  
  .save-btn { width: 100%; background: #28a745; color: white; padding: 1rem; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
</style>
