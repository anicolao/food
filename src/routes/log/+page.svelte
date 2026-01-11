<script lang="ts">
  import { onMount } from 'svelte';
  import { analyzeImage, type NutritionEstimate } from '$lib/gemini';
  import { uploadImage, appendRow } from '$lib/sheets';
  import { dispatchEvent, store } from '$lib/store';
  import { goto } from '$app/navigation';

  let fileInput: HTMLInputElement;
  let cameraInput: HTMLInputElement;
  let imagePreview: string | null = null;
  let analyzing = false;
  let form: NutritionEstimate = {
    is_label: false,
    item_name: '',
    calories: 0,
    fat: { total: 0 },
    carbohydrates: { total: 0 },
    protein: 0
  };
  let mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' = 'Snack';
  let imageFile: File | null = null;

  onMount(() => {
    const hour = new Date().getHours();
    if (hour < 11) mealType = 'Breakfast';
    else if (hour < 16) mealType = 'Lunch';
    else if (hour < 22) mealType = 'Dinner';
    else mealType = 'Snack';
  });

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      imageFile = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview = e.target?.result as string;
        runAnalysis();
      };
      reader.readAsDataURL(imageFile);
    }
  }

  async function runAnalysis() {
    if (!imagePreview) return;
    analyzing = true;
    try {
      const base64 = imagePreview.split(',')[1];
      const mime = imagePreview.split(';')[0].split(':')[1];
      const result = await analyzeImage(base64, mime);
      // Clone to ensure mutability
      form = { ...result };
      // Dispatch "AI Received" event
      store.dispatch(dispatchEvent('log/aiEstimateReceived', { 
        imageName: imageFile?.name, 
        rawJson: result 
      }));
    } catch (e) {
      console.error(e);
      alert('Analysis failed');
    } finally {
      analyzing = false;
    }
  }

  async function handleSubmit() {
    if (!imageFile) return;
    try {
        // 1. Upload Image
        const driveFile = await uploadImage(imageFile, `FoodLog-${Date.now()}.jpg`);
        
        // 2. Dispatch Redux Event
        const entry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            mealType,
            description: form.item_name,
            calories: form.calories,
            fat: form.fat.total,
            carbs: form.carbohydrates.total,
            protein: form.protein,
            imageDriveUrl: driveFile.webViewLink,
            rawJson: form
        };
        
        store.dispatch(dispatchEvent('log/entryConfirmed', { entry }));

        // 3. Sync to Sheets (ActionType, Timestamp, PayloadJSON)
        // Ideally handled by middleware, but doing inline for MVP simplicity
        await appendRow('TODO_SPREADSHEET_ID', 'Events', [
            entry.id,
            new Date().toISOString(),
            'log/entryConfirmed',
            JSON.stringify({ entry })
        ]);

        goto('/');
    } catch (e) {
        console.error(e);
        alert('Failed to save');
    }
  }
</script>

<div class="container">
  <h1>Log Food</h1>

  <div class="upload-section">
    {#if !imagePreview}
      <div class="button-group">
          <button on:click={() => cameraInput.click()}>Take Photo</button>
          <button on:click={() => fileInput.click()} class="secondary">Upload File</button>
      </div>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        bind:this={cameraInput} 
        on:change={handleFileSelect} 
        hidden 
      />
      <input 
        type="file" 
        accept="image/*" 
        bind:this={fileInput} 
        on:change={handleFileSelect} 
        hidden 
      />
    {:else}
      <img src={imagePreview} alt="Preview" class="preview" />
      {#if analyzing}
        <p>Analyzing with Gemini...</p>
      {/if}
    {/if}
  </div>

  {#if imagePreview && !analyzing}
    <div class="form-section">
      <label>
        Meal Type
        <select bind:value={mealType}>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
          <option>Snack</option>
        </select>
      </label>

      <label>
        Item Name
        <input type="text" bind:value={form.item_name} />
      </label>

      <div class="macros">
        <label>
          Calories
          <input type="number" bind:value={form.calories} />
        </label>
        <label>
          Protein (g)
          <input type="number" bind:value={form.protein} />
        </label>
        <label>
          Carbs (g)
          <input type="number" bind:value={form.carbohydrates.total} />
        </label>
        <label>
          Fat (g)
          <input type="number" bind:value={form.fat.total} />
        </label>
      </div>

      <button on:click={handleSubmit} class="save-btn">Save Entry</button>
    </div>
  {/if}
</div>

<style>
  .container { padding: 1rem; max-width: 600px; margin: 0 auto; }
  .preview { width: 100%; max-height: 25vh; object-fit: contain; border-radius: 8px; margin-bottom: 1rem; }
  label { display: block; margin-bottom: 0.5rem; }
  input, select { width: 100%; padding: 0.5rem; margin-bottom: 1rem; }
  .macros { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .button-group { display: flex; gap: 1rem; }
  button { width: 100%; padding: 1rem; background: #007bff; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
  .secondary { background: #6c757d; }
  .save-btn { background: #28a745; margin-top: 1rem; }
</style>
