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
  
  import LogSheet from '$lib/components/ui/LogSheet.svelte';

  let fileInput = $state<HTMLInputElement>();
  let videoElement = $state<HTMLVideoElement>();
  let stream: MediaStream | null = null;
  let showCamera = $state(false);
  let showPhotosSelector = $state(false);

  let imageFiles: File[] = $state([]);
  let imagePreviews: string[] = $state([]);
  
  let analyzing = $state(false);
  
  // Flat State for inputs to avoid reactivity issues with Svelte 5 nested objects
  let itemName = $state('');
  let rationale = $state('');
  let calories = $state(0);
  let fat = $state(0);
  let carbs = $state(0);
  let protein = $state(0);
  
  let mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' = $state('Snack');
  let entryDate = $state(new Date().toISOString().split('T')[0]);
  let entryTime = $state(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

  // Derived display values for custom inputs
  let displayDate = $derived(entryDate); // ISO string is already what we want: YYYY-MM-DD
  let displayTime = $derived((() => {
      if (!entryTime) return '--:--';
      const [h, m] = entryTime.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
  })());

  let showCorrectionInput = $state(false);
  let userCorrection = $state('');
  
  // Sheet State
  let sheetOpen = $derived(imagePreviews.length > 0);

  function updateMealType(dateObj: Date) {
     const hour = dateObj.getHours();
     if (hour < 11) mealType = 'Breakfast';
     else if (hour < 16) mealType = 'Lunch';
     else if (hour < 22) mealType = 'Dinner';
     else mealType = 'Snack';
  }

  // --- Google Photos Logic ---
  let pickerUri = $state<string | null>(null);
  let pickerSessionId = $state<string | null>(null);
  let pickerWindow = $state<Window | null>(null);
  let pickerPollInterval = $state<any>(null);

  // Pre-fetch session when page mounts to enable synchronous Click-to-Open
  onMount(() => {
     updateMealType(new Date());
     // initPickerSession(); // [CI-DEBUG] Disabled to isolate instability
     
     const handleVisibility = () => {
         if (document.visibilityState === 'visible' && pickerSessionId) {
             console.log('App visible, checking picker status...');
             checkPickerSession();
         }
     };
     document.addEventListener('visibilitychange', handleVisibility);
     return () => {
         document.removeEventListener('visibilitychange', handleVisibility);
         stopPollingPicker();
     };
  });

  async function initPickerSession() {
      try {
          // Check if signed in first to avoid immediate prompt on load if not needed
          const token = await import('$lib/auth').then(m => m.getAccessToken());
          if (!token) return; // Wait for explicit sign in if no token

          console.log('Pre-fetching Google Photos Picker session...');
          const session = await createPickerSession();
          pickerSessionId = session.id;
          let uri = session.pickerUri;
          if (!uri.endsWith("/autoclose")) uri = uri.endsWith("/") ? `${uri}autoclose` : `${uri}/autoclose`;
          pickerUri = uri;
      } catch (e) {
          console.warn('Failed to pre-fetch picker session', e);
      }
  }

  async function handleGooglePhotosPick() {
      if (!pickerUri) {
          // If no URI yet (e.g. not signed in), try to sign in and initiate
          const token = await import('$lib/auth').then(m => m.getAccessToken());
          if (!token) {
             signIn();
             // After sign in, we can't synchronously open, but we can try to init for next time
             setTimeout(initPickerSession, 1000); 
          } else {
             // Token exists but init failed? Retry once
             await initPickerSession();
             if (pickerUri) {
                console.warn('Photos ready. Please tap again.');
             } else {
                console.error('Could not initialize Google Photos. Please check network.');
             }
          }
          return;
      }

      // Synchronous open
      pickerWindow = window.open(pickerUri, '_blank');
      startPollingPicker();
  }

  function startPollingPicker() {
      stopPollingPicker();
      pickerPollInterval = setInterval(() => checkPickerSession(), 2000);
  }

  function stopPollingPicker() {
      if (pickerPollInterval) {
          clearInterval(pickerPollInterval);
          pickerPollInterval = null;
      }
  }

  async function checkPickerSession() {
      if (!pickerSessionId) return;
      try {
          const sessionStatus = await pollPickerSession(pickerSessionId);
          if (sessionStatus.mediaItemsSet) {
              stopPollingPicker();
              if (pickerWindow && !pickerWindow.closed) pickerWindow.close();
              
              const items = await listSessionMediaItems(pickerSessionId);
              if (items.length > 0) {
                  const token = await import('$lib/auth').then(m => m.getAccessToken() || '');
                  for (const item of items) {
                      await processPickedItem(item, token);
                  }
                  // Reset session for next time
                  pickerSessionId = null;
                  pickerUri = null;
                  initPickerSession(); 
              }
          }
      } catch (e) {
          console.error('Picker poll failed', e);
      }
  }

  async function processPickedItem(item: any, token: string) {
      if (!item.baseUrl) return;
      if (item.creationTime && imageFiles.length === 0) {
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
          if (res.ok) {
              const blob = await res.blob();
              const file = new File([blob], item.filename || `photo-${Date.now()}.jpg`, { type: item.mimeType || blob.type || 'image/jpeg' });
              await addImage(file);
          }
      } catch (e) {
          console.error('Failed to download media', e);
      }
  }

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
        console.error('Could not access camera');
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

  let analysisTimer: NodeJS.Timeout;

  async function addImage(file: File) {
      try {
           // @ts-ignore
           const exifData = await exifr.parse(file);
           if (exifData && (exifData.DateTimeOriginal || exifData.CreateDate)) {
               const date = exifData.DateTimeOriginal || exifData.CreateDate;
               // Date to Local YYYY-MM-DD
               const year = date.getFullYear();
               const month = String(date.getMonth() + 1).padStart(2, '0');
               const day = String(date.getDate()).padStart(2, '0');
               entryDate = `${year}-${month}-${day}`;
               
               entryTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
               updateMealType(date);
           } else if (imageFiles.length === 0) {
               const date = new Date(file.lastModified || Date.now());
               // Date to Local YYYY-MM-DD
               const year = date.getFullYear();
               const month = String(date.getMonth() + 1).padStart(2, '0');
               const day = String(date.getDate()).padStart(2, '0');
               entryDate = `${year}-${month}-${day}`;
               
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
              
              if (analysisTimer) clearTimeout(analysisTimer);
              analysisTimer = setTimeout(() => {
                  runAnalysis();
              }, 500);
          }
      };
      reader.readAsDataURL(file);
  }

  async function runAnalysis(correction?: string) {
    console.log('[CI-DEBUG] runAnalysis called');
    if (imagePreviews.length === 0) return;
    
    analyzing = true;
    try {
      // Force render tick to ensure 'analyzing' state is visible even if analyzeImage fails fast
      await new Promise(r => setTimeout(r, 1)); 

      const images = imagePreviews.map((preview, i) => {
          try {
              return {
                  base64: preview.split(',')[1],
                  mimeType: preview.split(';')[0].split(':')[1]
              };
          } catch (e) {
              console.error(`Failed to parse image ${i}`, e);
              throw e;
          }
      });
      
      const previousRationale = rationale;
      const result = await analyzeImage(images, correction ? previousRationale : undefined, correction);
      
      itemName = result.item_name || '';
      rationale = result.rationale || '';
      calories = result.calories || 0;
      protein = result.protein || 0;
      carbs = result.carbohydrates?.total || 0;
      fat = result.fat?.total || 0;
      
      if (correction) {
          showCorrectionInput = false;
          userCorrection = '';
      }

      store.dispatch(dispatchEvent('log/aiEstimateReceived', { 
        imagesCount: imageFiles.length, 
        rawJson: result 
      }));
    } catch (e) {
      console.error('Analysis failed', e);
      console.warn('Analysis failed: ' + e);
    } finally {
      analyzing = false;
    }
  }

  function handleReanalyze() {
      if (!userCorrection) return;
      runAnalysis(userCorrection);
  }

  // [CI-DEBUG] Instrumenting to catch phantom calls
  async function handleSubmit(e?: Event) {
    console.log('[CI-DEBUG] handleSubmit called', e);
    if (e) console.log('[CI-DEBUG] Event type:', e.type, 'Target:', e.target);
    console.trace('[CI-DEBUG] handleSubmit trace');

    if (imageFiles.length === 0) return;
    try {
        const state = store.getState();
        // @ts-ignore
        const folderId = state.config?.folderId || undefined;
        
        const uploadPromises = imageFiles.map(file => 
            uploadImage(file, `FoodLog-${Date.now()}-${file.name}`, folderId)
        );
        const driveFiles = await Promise.all(uploadPromises);
        const driveUrls = driveFiles.map(f => {
            if (f.thumbnailLink) return f.thumbnailLink;
            if (f.id) return `https://drive.google.com/thumbnail?id=${f.id}&sz=w2048`;
            return f.webViewLink;
        }).join(', ');

        const isoDateTime = new Date(`${entryDate}T${entryTime}`).toISOString();

        // Construct object for Redux/Storage, avoiding proxy issues by using plain collected values
        const form = {
            item_name: itemName,
            rationale,
            calories,
            protein,
            carbohydrates: { total: carbs },
            fat: { total: fat }
        };

        const entry = {
            id: crypto.randomUUID(),
            date: entryDate,
            time: entryTime, 
            mealType,
            description: itemName,
            rationale, 
            calories,
            fat,
            carbs,
            protein,
            imageDriveUrl: driveUrls, // Comma separated URLs
            rawJson: JSON.parse(JSON.stringify(form))
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
        }

        goto(`${base}/`);
    } catch (e) {
        console.error(e);
        console.error('Failed to save');
    }
  }

  function handleCloseSheet() {
      if (confirm('Discard entry?')) {
          resetForm();
      }
  }

  function resetForm() {
      imageFiles = [];
      imagePreviews = [];
      itemName = '';
      rationale = '';
      calories = 0;
      protein = 0;
      carbs = 0;
      fat = 0;
      showCorrectionInput = false;
      userCorrection = '';
  }
</script>

<div class="log-page">
    {#if showCamera}
        <div class="camera-ui">
             <video bind:this={videoElement} autoplay playsinline muted></video>
             <div class="cam-controls">
                 <button class="cam-btn capture" onclick={capturePhoto} aria-label="Capture photo"></button>
                 <button class="cam-btn cancel" onclick={stopCamera}>Cancel</button>
             </div>
        </div>
    {:else}
        <!-- Pre-capture State / Background -->
        <div class="start-ui">
            <h1>Log Food</h1>
            <div class="action-buttons">
                <button class="big-btn glass-panel" onclick={startCamera}>
                    <div class="icon">📷</div>
                    <span>Camera</span>
                </button>
                <button class="big-btn glass-panel" onclick={handleGooglePhotosPick}>
                    <div class="icon">🖼️</div>
                    <span>Photo Library</span>
                </button>
                <!-- Hidden file input for file picker fallback if library fails or just standard upload -->
                <button class="big-btn glass-panel" onclick={() => fileInput?.click()}>
                    <div class="icon">📁</div>
                    <span>File</span>
                </button>
            </div>
            
            <input type="file" accept="image/*" multiple bind:this={fileInput} onchange={handleFileSelect} hidden />
        </div>
    {/if}

    <LogSheet open={sheetOpen} onClose={handleCloseSheet}>
         <div class="sheet-content">
             <div class="preview-strip">
                 {#each imagePreviews as preview}
                     <img src={preview} alt="Thumb" class="sheet-thumb" />
                 {/each}
                <button class="add-more-btn" onclick={() => fileInput?.click()}>+</button>
             </div>
             
             {#if analyzing}
                 <div class="analyzing-state">
                     <div class="magic-sparkle">✨</div>
                     <p>Analyzing {imagePreviews.length} images with Gemini...</p>
                 </div>
             {:else}
                 <div class="form-grid">
                      <div class="split-row">
                          <div class="field">
                              <label>Date
                                 <div class="custom-input-wrapper bg-input">
                                     <span class="value-text">{displayDate}</span>
                                     <span class="input-icon">📅</span>
                                     <input type="date" bind:value={entryDate} class="native-input-overlay" />
                                 </div>
                              </label>
                          </div>
                          <div class="field">
                              <label>Time
                                 <div class="custom-input-wrapper bg-input">
                                     <span class="value-text">{displayTime}</span>
                                     <span class="input-icon">🕒</span>
                                     <input type="time" bind:value={entryTime} class="native-input-overlay" />
                                 </div>
                              </label>
                          </div>
                      </div>
                      
                      <div class="field">
                          <label>Meal
                            <select bind:value={mealType} class="bg-input">
                                <option>Breakfast</option>
                                <option>Lunch</option>
                                <option>Dinner</option>
                                <option>Snack</option>
                            </select>
                          </label>
                      </div>

                      <div class="field">
                          <label>Log Description
                            <input type="text" bind:value={itemName} class="bg-input big-text" placeholder="What is this?" />
                          </label>
                      </div>
                      
                      <div class="macros-row">
                          <div class="macro-field">
                              <label>Cals
                                <input type="number" bind:value={calories} class="bg-input highlight-cal" />
                              </label>
                          </div>
                          <div class="macro-field">
                              <label>Prot
                                <input type="number" bind:value={protein} class="bg-input" />
                              </label>
                          </div>
                          <div class="macro-field">
                              <label>Carb
                                <input type="number" bind:value={carbs} class="bg-input" />
                              </label>
                          </div>
                          <div class="macro-field">
                              <label>Fat
                                <input type="number" bind:value={fat} class="bg-input" />
                              </label>
                          </div>
                      </div>

                      <div class="rationale-box">
                          <p class="rationale-text">{rationale}</p>
                          <button class="correct-btn" onclick={() => showCorrectionInput = !showCorrectionInput}>
                             {showCorrectionInput ? 'Cancel Correction' : 'Correct AI'}
                          </button>
                      </div>
                      
                      {#if showCorrectionInput}
                         <div class="correction-area">
                              <textarea bind:value={userCorrection} placeholder="e.g. It was 2 eggs, not 3" rows="2" class="bg-input"></textarea>
                              <button class="primary-btn small" onclick={handleReanalyze} disabled={!userCorrection}>Retry</button>
                         </div>
                      {/if}

                      <button class="save-btn-primary" onclick={handleSubmit}>Save Entry</button>
                 </div>
             {/if}
         </div>
    </LogSheet>
     

</div>
<style>
    .log-page {
        min-height: 100vh;
        padding-bottom: 120px;
    }

    .start-ui {
        padding: 40px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 40px;
    }

    .action-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 100%;
        max-width: 500px;
    }

    .big-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 120px;
        color: var(--text-primary);
        background: var(--bg-card-glass);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: var(--radius-m);
        gap: 10px;
        transition: transform 0.2s;
    }

    .big-btn:active {
        transform: scale(0.95);
    }

    .icon {
        font-size: 2.5rem;
    }

    /* Camera UI */
    .camera-ui {
        position: fixed;
        top: 0; 
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 50;
    }
    
    video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .cam-controls {
        position: absolute;
        bottom: 50px;
        width: 100%;
        display: flex;
        justify-content: center;
        gap: 40px;
        align-items: center;
    }
    
    .cam-btn.capture {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 5px solid rgba(255,255,255,0.5);
        background: white;
    }
    
    .cam-btn.cancel {
        background: rgba(0,0,0,0.5);
        color: white;
        border: 1px solid white;
        padding: 10px 20px;
        border-radius: 20px;
    }

    /* Sheet Content */
    .sheet-content {
        padding-bottom: 40px;
    }
    
    .preview-strip {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        overflow-x: auto;
    }
    
    .sheet-thumb {
        width: 80px;
        height: 80px;
        border-radius: var(--radius-s);
        object-fit: cover;
        border: 2px solid rgba(255,255,255,0.1);
    }
    
    .add-more-btn {
        width: 80px;
        height: 80px;
        border-radius: var(--radius-s);
        background: rgba(255,255,255,0.1);
        color: white;
        border: none;
        font-size: 2rem;
    }

    .form-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .split-row {
        display: flex;
        gap: 16px;
    }
    
    .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
    }
    
    label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .bg-input {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: white;
        padding: 12px;
        border-radius: var(--radius-m);
        font-size: 1rem;
    }

    /* Custom Input Wrapper */
    .custom-input-wrapper {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        overflow: hidden; /* Ensure overlay doesn't spill */
    }

    .value-text {
        font-variant-numeric: tabular-nums;
        z-index: 1;
    }

    .input-icon {
        opacity: 0.7;
        z-index: 1;
        font-size: 1.1rem;
    }

    .native-input-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        background: transparent;
        border: none;
        appearance: none;
        -webkit-appearance: none;
        z-index: 2; /* On top of text */
    }
    
    .bg-input:focus-within {
        border-color: var(--color-primary);
        background: rgba(255,255,255,0.1);
    }
    
    .big-text {
        font-size: 1.2rem;
        font-weight: 600;
    }
    
    .macros-row {
        display: flex;
        gap: 10px;
    }
    
    .macro-field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .macro-field input {
        text-align: center;
        padding: 10px 4px;
    }
    
    .highlight-cal {
        color: var(--text-accent);
        font-weight: bold;
    }
    
    .rationale-box {
        background: rgba(255,255,255,0.03);
        padding: 12px;
        border-radius: var(--radius-m);
        margin-top: 10px;
    }
    
    .rationale-text {
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.5;
        font-style: italic;
        margin-bottom: 8px;
    }
    
    .correct-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-size: 0.85rem;
        padding: 4px;
        cursor: pointer;
        text-decoration: underline;
    }
    
    .correction-area {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
    }
    
    textarea.bg-input {
        width: 100%;
        resize: vertical;
    }

    .save-btn-primary {
        background: var(--color-primary);
        color: white;
        padding: 16px;
        border-radius: var(--radius-m);
        border: none;
        font-size: 1.1rem;
        font-weight: 600;
        margin-top: 10px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    
    .analyzing-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        gap: 20px;
    }
    
    .magic-sparkle {
        font-size: 3rem;
        animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
    }
</style>
