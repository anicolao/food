<script lang="ts">
  import { onMount } from 'svelte';
  import { analyzeImage, type NutritionEstimate } from '$lib/gemini';
  import { uploadImage, appendRow } from '$lib/sheets';
  import { dispatchEvent, store } from '$lib/store';
  import { signIn } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  // @ts-ignore
  import exifr from 'exifr'; 
  import { createPickerSession, pollPickerSession, listSessionMediaItems } from '$lib/google-photos';

  let fileInput: HTMLInputElement;
  let videoElement: HTMLVideoElement;
  let stream: MediaStream | null = null;
  let showCamera = false;

  // Single file input for legacy/file picker, but we process into arrays
  let imageFiles: File[] = [];
  let imagePreviews: string[] = [];
  
  let analyzing = false;
  let form: NutritionEstimate = {
    is_label: false,
    item_name: '',
    rationale: '',
    calories: 0,
    fat: { total: 0 },
    carbohydrates: { total: 0 },
    protein: 0
  };
  
  let mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' = 'Snack';
  let entryDate = new Date().toISOString().split('T')[0];
  let entryTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Correction State
  let showCorrectionInput = false;
  let userCorrection = '';

  function updateMealType(dateObj: Date) {
     const hour = dateObj.getHours();
     if (hour < 11) mealType = 'Breakfast';
     else if (hour < 16) mealType = 'Lunch';
     else if (hour < 22) mealType = 'Dinner';
     else mealType = 'Snack';
  }

  onMount(() => {
    updateMealType(new Date());
  });

  async function startCamera() {
    showCamera = true;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
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
    
    // Add to lists
    canvas.toBlob(blob => {
        if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            addImage(file);
        }
    }, 'image/jpeg');

    stopCamera();
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      for (let i = 0; i < target.files.length; i++) {
          await addImage(target.files[i]);
      }
    }
  }

  async function addImage(file: File) {
      // 1. Parse EXIF for Date/Time (Use first valid found)
      try {
           // @ts-ignore
           const exifData = await exifr.parse(file);
           if (exifData && (exifData.DateTimeOriginal || exifData.CreateDate)) {
               const date = exifData.DateTimeOriginal || exifData.CreateDate;
               // Only update if it's the first image or we want to prioritize latest? 
               // Let's rely on the first image causing an update, or just update every time.
               entryDate = date.toISOString().split('T')[0];
               entryTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
               updateMealType(date);
           } else if (imageFiles.length === 0) {
               // Fallback only if this is the first image
               const date = new Date(file.lastModified || Date.now());
               entryDate = date.toISOString().split('T')[0];
               entryTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
               updateMealType(date);
           }
      } catch (e) {
           console.warn('EXIF parse failed', e);
      }

      imageFiles = [...imageFiles, file];

      const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target?.result) {
            imagePreviews = [...imagePreviews, e.target.result as string];
            
            // Debounce analysis to allow multiple images to be added
            if (analysisTimer) clearTimeout(analysisTimer);
            analysisTimer = setTimeout(() => {
                runAnalysis();
            }, 1000);
        }
    };
    reader.readAsDataURL(file);
  }

  let analysisTimer: NodeJS.Timeout;

  async function runAnalysis(correction?: string) {
    if (imagePreviews.length === 0) {
        console.warn('runAnalysis: No images to analyze');
        return;
    }
    
    console.log('runAnalysis: Starting...', { 
        imageCount: imagePreviews.length, 
        correction,
        firstImageLength: imagePreviews[0]?.length 
    });

    analyzing = true;
    try {
      // Prepare all images
      const images = imagePreviews.map((preview, i) => {
          try {
              return {
                  base64: preview.split(',')[1],
                  mimeType: preview.split(';')[0].split(':')[1]
              };
          } catch (e) {
              console.error(`runAnalysis: Failed to parse image ${i}`, e);
              throw e;
          }
      });
      
      console.log('runAnalysis: Images prepared, calling Gemini...');
      
      const previousRationale = form.rationale;
      const result = await analyzeImage(images, correction ? previousRationale : undefined, correction);
      
      console.log('runAnalysis: Gemini response received', result);

      form = { 
          ...result, 
          rationale: result.rationale || '',
          fat: result.fat || { total: 0 },
          carbohydrates: result.carbohydrates || { total: 0 },
          calories: result.calories || 0,
          protein: result.protein || 0,
          item_name: result.item_name || ''
      };
      
      if (correction) {
          showCorrectionInput = false;
          userCorrection = '';
      }

      store.dispatch(dispatchEvent('log/aiEstimateReceived', { 
        imagesCount: imageFiles.length, 
        rawJson: result 
      }));
    } catch (e) {
      console.error('runAnalysis: FATAL ERROR', e);
      alert('Analysis failed: ' + e);
    } finally {
      analyzing = false;
    }
  }

  function handleReanalyze() {
      if (!userCorrection) return;
      runAnalysis(userCorrection);
  }

  async function handleSubmit() {
    if (imageFiles.length === 0) return;
    try {
        const state = store.getState();
        // @ts-ignore
        const folderId = state.config?.folderId || undefined;
        
        // Upload ALL images
        const uploadPromises = imageFiles.map(file => 
            uploadImage(file, `FoodLog-${Date.now()}-${file.name}`, folderId)
        );
        const driveFiles = await Promise.all(uploadPromises);
        // Prefer thumbnailLink, fallback to constructed thumbnail URL (reliable), then webViewLink
        const driveUrls = driveFiles.map(f => {
            if (f.thumbnailLink) return f.thumbnailLink;
            if (f.id) return `https://drive.google.com/thumbnail?id=${f.id}&sz=w2048`;
            return f.webViewLink;
        }).join(', ');

        const isoDateTime = new Date(`${entryDate}T${entryTime}`).toISOString();

        const entry = {
            id: crypto.randomUUID(),
            date: entryDate,
            time: entryTime, 
            mealType,
            description: form.item_name,
            rationale: form.rationale, 
            calories: form.calories,
            fat: form.fat.total,
            carbs: form.carbohydrates.total,
            protein: form.protein,
            imageDriveUrl: driveUrls, // Comma separated URLs
            rawJson: form
        };
        
        store.dispatch(dispatchEvent('log/entryConfirmed', { entry }));

        // @ts-ignore
        const spreadsheetId = state.config?.spreadsheetId;

        if (spreadsheetId) {
             await appendRow(spreadsheetId, 'Events', [
                entry.id,
                isoDateTime,
                'log/entryConfirmed',
                JSON.stringify({ entry })
            ]);
        } else {
            console.warn('No spreadsheet ID found, skipping sync');
        }

        goto(`${base}/`);
    } catch (e) {
        console.error(e);
        alert('Failed to save');
    }
  }

  // --- Google Photos Logic ---

  async function handleGooglePhotosPick() {
     const token = await new Promise<string>((resolve) => {
         import('$lib/auth').then(m => resolve(m.getAccessToken() || ''));
     });

     if (!token) {
         signIn();
         alert('Please Sign In first');
         return;
     }

     try {
         const session = await createPickerSession();
         const sessionId = session.id;
         
         let uri = session.pickerUri;
         if (!uri.endsWith("/autoclose")) {
             uri = uri.endsWith("/") ? `${uri}autoclose` : `${uri}/autoclose`;
         }
         const popup = window.open(uri, 'googlePicker', 'width=800,height=600');
         
         console.log('Starting poll loop for session:', sessionId);
         let attempts = 0;
         const MAX_ATTEMPTS = 60; 

         const poll = setInterval(async () => {
             attempts++;
             if (attempts > MAX_ATTEMPTS) {
                 clearInterval(poll);
                 console.warn('Polling timed out.');
                 alert('Selection timed out. Please try again.');
                 return;
             }

             try {
                const status = await pollPickerSession(sessionId);
                if (status.mediaItemsSet) {
                    clearInterval(poll);
                    if (popup && !popup.closed) popup.close();
                    
                    const items = await listSessionMediaItems(sessionId);
                    if (items.length > 0) {
                        // User requested to send ALL together
                        for (const item of items) {
                            await processPickedItem(item, token);
                        }
                    } else {
                        alert('No photos selected');
                    }
                }
             } catch (e) {
                 console.error('Polling error', e);
             }
         }, 2000); 

     } catch (e) {
         console.error('Picker Flow Failed', e);
         alert('Failed to open Photos Picker: ' + e);
     }
  }

  async function processPickedItem(item: any, token: string) {
      if (!item.baseUrl) return;
      
      // Timestamp logic (Priority to API metadata if valid)
      if (item.creationTime && imageFiles.length === 0) {
           // Only set time on first photo to avoid jumping around
          const date = new Date(item.creationTime);
          entryDate = date.toISOString().split('T')[0];
          entryTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          updateMealType(date);
      }

      let fetchUrl = item.baseUrl;
      if (fetchUrl.includes("drive.google.com/thumbnail")) {
           const match = fetchUrl.match(/id=([^&]+)/);
           if (match) fetchUrl = `https://www.googleapis.com/drive/v3/files/${match[1]}?alt=media`;
      } else if (fetchUrl.includes("googleusercontent.com")) {
           fetchUrl = `${fetchUrl}=w2048-h2048`; 
      }

      try {
          const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error('Fetch failed');
          const blob = await res.blob();
          
          const file = new File([blob], item.filename || `photo-${Date.now()}.jpg`, { type: item.mimeType || blob.type || 'image/jpeg' });
          
          // Re-trigger addImage which does EXIF + array push + analysis
          await addImage(file);

      } catch (e) {
          console.error('Failed to download media', e);
      }
  }

  function resetForm() {
      imageFiles = [];
      imagePreviews = [];
      form = {
        is_label: false,
        item_name: '',
        rationale: '',
        calories: 0,
        fat: { total: 0 },
        carbohydrates: { total: 0 },
        protein: 0
      };
      showCorrectionInput = false;
      userCorrection = '';
  }
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
    {:else}
      <!-- Always show buttons to add MORE photos if we want, or just hide if previews exist? 
           User might want to add more. Let's keep buttons visible but smaller if images exist. -->
      
      <div class="button-group">
          <button on:click={startCamera}>Take Photo</button>
          <button on:click={handleGooglePhotosPick} class="secondary">Pick Photos</button>
          {#if imagePreviews.length > 0}
             <button on:click={resetForm} class="secondary warning">Reset</button>
          {/if}
      </div>

      <input type="file" accept="image/*" multiple bind:this={fileInput} on:change={handleFileSelect} hidden />
      
      {#if imagePreviews.length > 0}
          <div class="previews-grid">
              {#each imagePreviews as preview}
                  <img src={preview} alt="Preview" class="preview-thumb" />
              {/each}
          </div>
          {#if analyzing}
            <p>Analyzing {imagePreviews.length} images with Gemini...</p>
          {/if}
      {/if}

    {/if}
  </div>

  {#if imagePreviews.length > 0 && !analyzing}
    <div class="form-section">
      <div class="datetime-row">
          <label>Date <input type="date" bind:value={entryDate} /></label>
          <label>Time <input type="time" bind:value={entryTime} ></label>
      </div>

      <label>Meal Type
        <select bind:value={mealType}>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
          <option>Snack</option>
        </select>
      </label>

      <label>Item Name <input type="text" bind:value={form.item_name} /></label>

      <label>Rationale <textarea bind:value={form.rationale} rows="3" placeholder="AI explanation..." readonly></textarea></label>

      <!-- Correction UI -->
      {#if !showCorrectionInput}
        <button on:click={() => showCorrectionInput = true} class="secondary small-btn">Reply / Correct AI</button>
      {:else}
        <div class="correction-box">
            <textarea bind:value={userCorrection} placeholder="Correct the AI..." rows="2"></textarea>
            <div class="correction-actions">
                <button on:click={handleReanalyze} class="primary small-btn" disabled={!userCorrection}>Re-analyze</button>
                <button on:click={() => showCorrectionInput = false} class="text-btn">Cancel</button>
            </div>
        </div>
      {/if}

      <div class="macros">
        <label>Calories <input type="number" bind:value={form.calories} /></label>
        <label>Protein (g) <input type="number" bind:value={form.protein} /></label>
        <label>Carbs (g) <input type="number" bind:value={form.carbohydrates.total} /></label>
        <label>Fat (g) <input type="number" bind:value={form.fat.total} /></label>
      </div>

      <button on:click={handleSubmit} class="save-btn">Save Entry</button>
    </div>
  {/if}
</div>

<style>
  .container { padding: 1rem; max-width: 600px; margin: 0 auto; }
  .previews-grid { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.5rem 0; }
  .preview-thumb { height: 100px; width: 100px; object-fit: cover; border-radius: 8px; flex-shrink: 0; border: 2px solid #ddd; }
  
  label { display: block; margin-bottom: 0.5rem; }
  input, select, textarea { width: 100%; padding: 0.5rem; margin-bottom: 1rem; }
  textarea { resize: vertical; }
  .datetime-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .macros { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .button-group { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  button { flex: 1; min-width: 120px; padding: 1rem; background: #007bff; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
  .secondary { background: #6c757d; }
  .warning { background: #dc3545; }
  .small-btn { padding: 0.5rem; font-size: 0.9rem; margin-bottom: 1rem; }
  .text-btn { background: none; color: #666; width: auto; padding: 0.5rem; }
  .save-btn { background: #28a745; margin-top: 1rem; width: 100%; }
  
  .correction-box { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #ddd; }
  .correction-actions { display: flex; gap: 0.5rem; align-items: center; }
  
  .camera-overlay { position: relative; width: 100%; height: 60vh; background: #000; display: flex; flex-direction: column; align-items: center; border-radius: 8px; overflow: hidden; }
  video { width: 100%; height: 100%; object-fit: cover; }
  .camera-controls { position: absolute; bottom: 20px; display: flex; gap: 20px; width: 100%; justify-content: center; }
  .capture-btn { width: 60px; height: 60px; border-radius: 50%; background: white; border: 4px solid #ccc; text-indent: -9999px; overflow: hidden; padding: 0; }
  .cancel-btn { background: rgba(255, 255, 255, 0.3); color: white; border: none; padding: 0.5rem 1rem; border-radius: 20px; height: fit-content; align-self: center; width: auto; }
</style>
