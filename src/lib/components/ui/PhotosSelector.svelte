<script lang="ts">
  import { createPickerSession, pollPickerSession, listSessionMediaItems, type MediaItem } from '$lib/google-photos';
  import { fade } from 'svelte/transition';
  import { signIn } from '$lib/auth';

  let { open = $bindable(false), onSelect } = $props<{ 
      open: boolean, 
      onSelect: (items: MediaItem[]) => void 
  }>();

  let loading = $state(false);
  let error = $state<string | null>(null);
  let status = $state('Initializing...');
  
  let pollInterval = $state<any>(null);
  let sessionId = $state<string | null>(null);
  let pickerUri = $state<string | null>(null);
  let pickerWindow = $state<Window | null>(null);

  $effect(() => {
      // Auto-initialize session when opened
      if (open && !sessionId && !loading && !error) {
          initSession();
      }
      
      return () => {
          stopPolling();
      };
  });

  // Handle visibility change to aggressively poll when user returns to tab
  $effect(() => {
      const handleVisibility = () => {
          // If we are polling and become visible, check immediately
          if (document.visibilityState === 'visible' && sessionId && pollInterval) {
              console.log('App visible, checking picker status immediately...');
              checkSession();
          }
      };
      
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
  });

  async function initSession() {
      loading = true;
      error = null;
      status = 'Preparing Google Photos...';
      
      try {
          const session = await createPickerSession();
          sessionId = session.id;
          
          let uri = session.pickerUri;
          if (!uri.endsWith("/autoclose")) uri = uri.endsWith("/") ? `${uri}autoclose` : `${uri}/autoclose`;
          pickerUri = uri;
          
          status = 'Ready';
      } catch (e: any) {
          console.error(e);
          if (e.message && e.message.includes('Forbidden')) {
             error = 'Access denied. You may need to sign in again.';
          } else {
             error = 'Failed to prepare Picker. ' + (e.message || 'Unknown error');
          }
      } finally {
          loading = false;
      }
  }

  function launchPicker() {
      if (!pickerUri) return;
      
      // Open synchronously on user click
      pickerWindow = window.open(pickerUri, '_blank');
      
      status = 'Waiting for selection...';
      startPolling();
  }

  function startPolling() {
      stopPolling();
      const checkFn = () => checkSession();
      // Poll slower to save resources, rely on visibility change for the "instant" feel
      pollInterval = setInterval(checkFn, 2000);
  }

  function stopPolling() {
      if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
      }
  }

  async function checkSession() {
      if (!sessionId) return;
      
      try {
          const sessionStatus = await pollPickerSession(sessionId);
          if (sessionStatus.mediaItemsSet) {
              stopPolling();
              status = 'Processing photos...';
              
              if (pickerWindow && !pickerWindow.closed) {
                  pickerWindow.close();
              }

              const items = await listSessionMediaItems(sessionId);
              if (items.length > 0) {
                  onSelect(items);
                  handleClose();
              } else {
                  error = 'No photos were selected.';
              }
          }
      } catch (e) {
          console.error('Poll failed silently', e);
      }
  }

  async function handleGrantPermission() {
     signIn();
     // Reset state to try init again
     handleRetry();
  }
  
  async function handleSignOut() {
      const { signOut } = await import('$lib/auth');
      signOut();
      alert('Signed out. Please click Photo Library to sign in again.');
      handleClose();
  }

  function handleClose() {
      stopPolling();
      sessionId = null;
      pickerUri = null;
      error = null;
      open = false;
  }
  
  function handleRetry() {
      stopPolling();
      sessionId = null;
      pickerUri = null;
      error = null;
      // Effect will trigger initSession
  }
</script>

{#if open}
    <div class="photos-overlay" transition:fade={{ duration: 200 }}>
        <div class="dialog">
            <h2>Google Photos</h2>
            
            {#if error}
                <div class="state error">
                    <p class="msg">{error}</p>
                    <div class="actions">
                        <button class="primary-btn" onclick={handleRetry}>Try Again</button>
                        <button class="text-btn" onclick={handleClose}>Cancel</button>
                    </div>
                    <div class="actions sub">
                        <button class="text-btn small" onclick={handleGrantPermission}>Re-Authorise</button>
                        <button class="text-btn small" onclick={handleSignOut}>Sign Out</button>
                    </div>
                </div>
            {:else if pickerUri && !pollInterval}
                <!-- Ready State -->
                <div class="state ready">
                    <p>Ready to select photos.</p>
                    <button class="primary-btn big" onclick={launchPicker}>Open Photos Picker</button>
                    <button class="text-btn" onclick={handleClose}>Cancel</button>
                </div>
            {:else}
                <!-- Loading or Polling State -->
                <div class="state waiting">
                    <div class="spinner"></div>
                    <p>{status}</p>
                    <button class="text-btn" onclick={handleClose}>Cancel</button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .photos-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    }

    .dialog {
        background: var(--bg-card, #222);
        padding: 30px;
        border-radius: 20px;
        width: 90%;
        max-width: 400px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }

    h2 {
        margin: 0 0 20px 0;
        font-size: 1.2rem;
        color: white;
    }

    .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
    }
    
    .msg {
        color: var(--text-destructive, #ff6b6b);
        line-height: 1.4;
    }
    
    .sub-text {
        font-size: 0.9rem;
        color: #aaa;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: var(--color-primary, #4caf50);
        border-radius: 50%;
        animation: spin 1s infinite linear;
    }
    
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .actions.sub {
        margin-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 10px;
        width: 100%;
    }

    .primary-btn {
        background: var(--color-primary, #4caf50);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
    }

    .text-btn {
        background: none;
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
    }
    
    .text-btn.small {
        font-size: 0.8rem;
        padding: 8px 12px;
        opacity: 0.8;
        border: none;
    }
</style>
