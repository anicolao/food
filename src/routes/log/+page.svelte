<script lang="ts">
  import { onMount } from 'svelte';
  import { analyzeImage, type NutritionEstimate } from '$lib/gemini';
  import { uploadImage, appendRow } from '$lib/sheets';
  import { dispatchEvent, store } from '$lib/store';
  import { signIn } from '$lib/auth'; // Added signIn
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

  let showCamera = false;
  let videoElement: HTMLVideoElement;
  let stream: MediaStream | null = null;

  async function startCamera() {
    showCamera = true;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        // Svelte bind:this updates after render, wait a tick or use reactive statement
        // checking videoElement in simple timeout or lifecycle would be better but:
        setTimeout(() => {
            if (videoElement) videoElement.srcObject = stream;
        }, 100);
    } catch (e) {
        console.error('Camera failed', e);
        alert('Could not access camera');
        showCamera = false;
    }
  }

  function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    showCamera = false;
  }

  function capturePhoto() {
    if (!videoElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoElement, 0, 0);
    
    imagePreview = canvas.toDataURL('image/jpeg');
    
    canvas.toBlob(blob => {
        if (blob) {
            imageFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            runAnalysis();
        }
    }, 'image/jpeg');

    stopCamera();
  }

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
        const state = store.getState();
        // @ts-ignore - dealing with typed store wrapper issues in svelte file for now
        const folderId = state.config?.folderId;
        const driveFile = await uploadImage(imageFile, `FoodLog-${Date.now()}.jpg`, folderId);
        
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

        // 3. Sync to Sheets
        // @ts-ignore
        const spreadsheetId = state.config?.spreadsheetId;

        if (spreadsheetId) {
             await appendRow(spreadsheetId, 'Events', [
                entry.id,
                new Date().toISOString(),
                'log/entryConfirmed',
                JSON.stringify({ entry })
            ]);
        } else {
            console.warn('No spreadsheet ID found, skipping sync');
        }

        goto('/');
    } catch (e) {
        console.error(e);
        alert('Failed to save');
    }
  }
  // --- Google Picker ---

  let gapiLoaded = false;

  async function loadGapi() {
    if (gapiLoaded) return;
    return new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            window.gapi.load('picker', () => {
                gapiLoaded = true;
                resolve();
            });
        };
        document.body.appendChild(script);
    });
  }

  async function handleGooglePhotosPick() {
     // 1. Ensure Auth Token
     const token = await new Promise<string>((resolve) => {
         import('$lib/auth').then(m => resolve(m.getAccessToken() || ''));
     });

     if (!token) {
         signIn(); // Trigger sign in if missing? Better to alert.
         alert('Please Sign In first');
         return;
     }

     // 2. Ensure GAPI Loaded
     if (!gapiLoaded) {
        await loadGapi();
     }

     createPicker(token);
  }

  function createPicker(oauthToken: string) {
     const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.PHOTOS)
        .setOAuthToken(oauthToken)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_PICKER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY) 
        .setCallback(pickerCallback)
        .build();
     picker.setVisible(true);
  }

  async function pickerCallback(data: any) {
    if (data[window.google.picker.Response.ACTION] == window.google.picker.Action.PICKED) {
      const doc = data[window.google.picker.Response.DOCUMENTS][0];
      
      // Photos often returns a 'url' (permalink) and 'thumbnails'.
      // For actual bytes, we might rely on the fact we have the token.
      // However, Photos API MediaItems might be cleaner. 
      // The Picker "Photos" view returns items that might be accessible via simple fetch with auth.
      // Let's try the 'url' or potentially construct a fetch.
      // Actually, doc[google.picker.Document.URL] is the view link.
      // We need download URL.
      console.log('Picked Doc:', doc);
      
      // Fallback strategy:
      // Try fetching the high-res thumbnail.
      // doc.thumbnails -> array.
      // Or try fetching the URL if it allows.
      
      // Important: For Photos, obtaining the bytes can be tricky without the full Photos API 'mediaItems.get'.
      // But let's assume valid scope allows fetching the 'src' or similar if present.
      // Often doc.url is just the UI link.
      
      // Attempt to use the 'iconUrl' or 'thumbnails' to find a source?
      // Actually, typically we get an ID.
      // Let's try just alerting for now, as fetching bytes from a Picker Result for "Photos" specifically requires correct parsing. 
      // Better yet: Easiest way in pure frontend flow -> Fetch the blob from a provided sensitive URL if present?
      // Photos Picker often doesn't give a direct download link without using the Drive API or Photos API.
      // Let's try to simulate success by using a proxy or just the thumbnail for MVP if we can't get raw.
      
      // MVP Implementation:
      // If we can't easily get the blob (CORS/Auth), we might fail.
      // But let's try to fetch() the image if a valid src is exposed or construct one.
      // HACK: Use the thumbnail URL, resize it?
      // Better: If we have an ID, use Photos API (but that requires discovery).
      
      // Let's assume for MVP validation we just show we picked it.
      // But wait, "Upload to Drive" depends on `imageFile` (File object).
      // We MUST create a File object.
      
      // Try fetching the object via the 'thumbnails' URL (largest available)
      if (doc.thumbnails && doc.thumbnails.length > 0) {
         const thumb = doc.thumbnails[doc.thumbnails.length - 1]; // largest?
         // Thumbnails are usually small.
         
         // Real approach: "Photos" view items are not always direct mediaItems.
         // If we use ViewId.DOCS_IMAGES_AND_VIDEOS (Drive), it's easier.
         // But user asked for Photos.
         
         // Let's try to fetch the thumbnail url but manipulate it to be large? (Hack usually works with ggogleusercontent: =s0 ? or similar)
         // Default is often small.
         // Let's try fetching the `doc.url`? No that's HTML.
         // Let's look for `description` or `embedUrl`?
         
         // OK, Plan B: Prompt user this is a "Link" or try to fetch.
         // I'll try to fetch the `thumbnails[0].url` replacing size params if possible, or just use it.
         // Standard is `...=s132`. Replace with `=d` (download) or `=w2048-h2048`?
         let src = doc.thumbnails[0].url;
         // Try to upgrade resolution
         src = src.replace(/=s\d+/, '=w4096-h4096'); 
         
         try {
             const res = await fetch(src);
             const blob = await res.blob();
             imageFile = new File([blob], `photo-picked-${Date.now()}.jpg`, { type: 'image/jpeg' });
             
             const reader = new FileReader();
             reader.onload = (e) => {
                imagePreview = e.target?.result as string;
                runAnalysis();
             };
             reader.readAsDataURL(imageFile);
         } catch(e) {
             console.error('Failed to fetch picked photo', e);
             alert('Could not download photo. CORS or Auth issue.');
         }
      }
    }
  }

  onMount(() => {
    // ... logic
  });
</script>

<div class="container">
  <h1>Log Food</h1>

  <div class="upload-section">
    {#if showCamera}
        <div class="camera-overlay">
            <video bind:this={videoElement} autoplay playsinline muted></video>
            <div class="camera-controls">
                <button on:click={capturePhoto} class="capture-btn">Capture</button>
                <button on:click={stopCamera} class="cancel-btn">Cancel</button>
            </div>
        </div>
    {:else if !imagePreview}
      <div class="button-group">
          <button on:click={startCamera}>Take Photo</button>
          <button on:click={handleGooglePhotosPick} class="secondary">Pick from Photos</button>
      </div>
      <!-- Hidden input for potential fallback or internal use -->
      <input 
        type="file" 
        accept="image/*" 
        bind:this={fileInput} 
        on:change={handleFileSelect} 
        hidden 
      />
    {:else}
      <img src={imagePreview} alt="Preview" class="preview" />
      <div class="preview-controls">
        <button on:click={() => { imagePreview = null; form = { ...form, item_name: '' }; }} class="secondary">Retake</button>
      </div>
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
  
  .camera-overlay { 
    position: relative; 
    width: 100%; 
    height: 60vh; 
    background: #000; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    border-radius: 8px;
    overflow: hidden;
  }
  video { width: 100%; height: 100%; object-fit: cover; }
  .camera-controls { 
    position: absolute; 
    bottom: 20px; 
    display: flex; 
    gap: 20px; 
    width: 100%; 
    justify-content: center; 
  }
  .capture-btn { width: 60px; height: 60px; border-radius: 50%; background: white; border: 4px solid #ccc; text-indent: -9999px; overflow: hidden; padding: 0; }
  .cancel-btn { background: rgba(255, 255, 255, 0.3); color: white; border: none; padding: 0.5rem 1rem; border-radius: 20px; height: fit-content; align-self: center; width: auto; }
  .preview-controls { margin-bottom: 1rem; text-align: center; }
</style>
