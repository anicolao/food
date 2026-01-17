<script lang="ts">
  import { page } from '$app/stores';
  import { store, dispatchEvent } from '$lib/store';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount, tick } from 'svelte';

  import { formatLogDate } from '$lib/formatDate';
  import { resolveDriveImage } from '$lib/images';

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
  // @ts-ignore
  let galleryContainer: HTMLElement;

  onMount(async () => {
      if (!id) {
          goto(`${base}/`);
          return;
      }
      await tick();
      const state = store.getState();
      entry = state.projections.log.find(e => e.id === id);
      
      if (!entry) {
          goto(`${base}/`);
          return;
      }

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
         rationale: form.rationale,
         calories: Number(form.calories),
         protein: Number(form.protein),
         carbs: Number(form.carbs),
         fat: Number(form.fat)
     };

     store.dispatch(dispatchEvent('log/entryUpdated', { entryId: id, changes }));
     


     goto(`${base}/`);
  }

  async function handleDelete() {
      if (!confirm('Are you sure you want to delete this entry?')) return;
      if (!id) return;
      
      store.dispatch(dispatchEvent('log/entryDeleted', { entryId: id }));



      goto(`${base}/`);
  }
  
  function handleGalleryClick(e: MouseEvent) {
      if (!galleryContainer) return;

      const rect = galleryContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const center = rect.width / 2;
      const scrollAmount = rect.width * 0.85; 

      if (x > center) {
          galleryContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
          galleryContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
  }
</script>

<div class="page-container">
  <div class="nav-header">
      <a href="{base}/" class="text-link">&larr; Back</a>
      <h2 class="page-title">{entryDateTimeStr}</h2>
      <button class="delete-link" onclick={handleDelete}>Delete</button>
  </div>

  {#if imageUrls.length > 0}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="gallery" bind:this={galleryContainer} onclick={handleGalleryClick}>
          {#each imageUrls as url}
               {#await resolveDriveImage(url)}
                   <div class="loading-placeholder glass-panel">Loading...</div>
               {:then src}
                   <img src={src} class="hero-image" alt="Food" />
               {:catch}
                   <div class="error-placeholder glass-panel">Image Error</div>
               {/await}
          {/each}
      </div>
  {/if}

  <div class="glass-panel form-section">
      <div class="field">
          <label>Item Name
            <input type="text" class="bg-input big-text" bind:value={form.description} />
          </label>
      </div>
      
      <div class="field">
          <label>Meal Type
            <select class="bg-input" bind:value={form.mealType}>
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
            </select>
          </label>
      </div>

      <div class="macros-grid">
        <div class="field">
            <label>Calories
                <input type="number" class="bg-input highlight-cal" bind:value={form.calories} />
            </label>
        </div>
        <div class="field">
            <label>Protein (g)
                <input type="number" class="bg-input" bind:value={form.protein} />
            </label>
        </div>
        <div class="field">
            <label>Carbs (g)
                <input type="number" class="bg-input" bind:value={form.carbs} />
            </label>
        </div>
        <div class="field">
            <label>Fat (g)
                <input type="number" class="bg-input" bind:value={form.fat} />
            </label>
        </div>
      </div>

      <div class="field">
          <label>Rationale / Notes
            <textarea class="bg-input fixed-height" bind:value={form.rationale}></textarea>
          </label>
      </div>

      <button class="save-btn" onclick={handleSave}>Save Changes</button>
  </div>
</div>

<style>
  .page-container {
      padding: 20px;
      padding-bottom: 120px;
      max-width: 600px;
      margin: 0 auto;
  }
  
  .nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
  }
  
  .text-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
  }
  
  .page-title {
      font-size: 1.1rem;
      font-weight: 600;
  }
  
  .delete-link {
      background: none;
      border: none;
      color: #ff4d4d;
      font-size: 0.9rem;
      cursor: pointer;
  }
  
  .gallery {
      display: flex;
      overflow-x: auto;
      gap: 1rem;
      margin-bottom: 1.5rem;
      scroll-snap-type: x mandatory;
      padding-bottom: 10px;
  }
  
  .hero-image {
      width: 85%;
      height: 300px;
      object-fit: cover;
      border-radius: var(--radius-m);
      flex-shrink: 0;
      scroll-snap-align: center;
      border: 1px solid rgba(255,255,255,0.1);
  }
  
  .loading-placeholder, .error-placeholder {
      width: 85%;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-m);
      flex-shrink: 0;
  }
  
  .form-section {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
  }
  
  .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
  }
  
  label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
  }
  
  .bg-input {
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      color: white;
      padding: 12px;
      border-radius: var(--radius-m);
      font-size: 1rem;
      width: 100%;
      box-sizing: border-box;
  }
  
  .bg-input:focus {
      outline: none;
      border-color: var(--color-primary);
      background: rgba(0,0,0,0.3);
  }
  
  .big-text {
      font-size: 1.2rem;
      font-weight: 600;
  }
  
  .macros-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
  }
  
  .highlight-cal {
      color: var(--text-accent);
      font-weight: bold;
  }
  
  .save-btn {
      margin-top: 10px;
      background: var(--gradient-primary);
      color: white;
      border: none;
      padding: 16px;
      border-radius: 30px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
  }

  .fixed-height {
      height: 100px; /* Enforce consistency between OS/Browsers for regression testing */
      resize: vertical;
  }
</style>
