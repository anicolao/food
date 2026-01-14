<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { toasts } from '$lib/toast';

  const dispatch = createEventDispatcher();
  
  let recognizing = $state(false);
  let transcript = $state('');
  let recognition: any;
  let silenceTimer: any;
  let canvas: HTMLCanvasElement;
  let audioContext: AudioContext;
  let analyser: AnalyserNode;
  let microphone: MediaStreamAudioSourceNode;
  let stream: MediaStream;
  let animationId: number;

  onMount(async () => {
    // 1. Initialize Speech Recognition
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        toasts.error('Voice input not supported in this browser.');
        dispatch('close');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        recognizing = true;
        resetSilenceTimer();
    };

    recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
             toasts.error('Microphone access denied.');
             close();
        }
    };

    recognition.onend = () => {
        recognizing = false;
        if (transcript.trim()) {
            // Auto-submit on end if we have text? Or just stop?
            // Let's wait for user to hit stop or confirmed silence.
        }
    };

    recognition.onresult = (event: any) => {
        resetSilenceTimer();
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        // Append final to existing if needed, but usually SpeechRecognition accumulates efficiently.
        // Actually, we should just accumulate.
        let fullText = '';
        for (let i = 0; i < event.results.length; i++) {
             fullText += event.results[i][0].transcript;
        }
        transcript = fullText;
    };

    try {
        recognition.start();
        await startVisualizer();
    } catch (e) {
        console.error(e);
        close();
    }
  });

  onDestroy(() => {
    stop();
  });

  async function startVisualizer() {
      try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(analyser);
          analyser.fftSize = 256;
          
          visualize();
      } catch (e) {
          console.warn('Visualizer setup failed', e);
      }
  }

  function visualize() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
          if (!recognizing) return;
          animationId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Simple symmetric wave
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radius = 30 + (dataArray[0] / 255) * 20; // Pulse center

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 198, 255, 0.2)'; // Cyan glow
          ctx.fill();

          // Bar graph mirrored
          /* 
            This is a very simple placeholders visualizer. 
            Real implementation would be more "Siri-like" per specs, but this proves audio is live.
          */
           ctx.beginPath();
           ctx.strokeStyle = '#00C6FF';
           ctx.lineWidth = 2;
           
           const sliceWidth = canvas.width * 1.0 / bufferLength;
           let x = 0;
           
           for(let i = 0; i < bufferLength; i++) {
               const v = dataArray[i] / 128.0;
               const y = v * canvas.height/2;

               if(i === 0) {
                 ctx.moveTo(x, cy - y + (canvas.height/2));
               } else {
                 ctx.lineTo(x, cy - y + (canvas.height/2));
               }
               x += sliceWidth;
           }
           ctx.stroke();

      };
      draw();
  }

  function stop() {
      if (recognition) recognition.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioContext) audioContext.close();
      if (animationId) cancelAnimationFrame(animationId);
      recognizing = false;
  }

  function resetSilenceTimer() {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
          // Auto-stop after 4 seconds of silence? 
          // For now, let's keep it manual or just hint.
      }, 4000); 
  }

  function close() {
      stop();
      dispatch('close');
  }

  function done() {
      stop();
      if (transcript.trim()) {
          dispatch('analyze', transcript);
      } else {
          close();
      }
  }
</script>

<div class="modal-backdrop" onclick={close} role="presentation">
    <div class="voice-modal glass-panel" onclick={(e) => e.stopPropagation()} role="dialog">
        <canvas bind:this={canvas} width="300" height="150" class="visualizer"></canvas>
        
        <div class="transcript-box">
            {#if transcript}
                <p>{transcript}</p>
            {:else}
                <p class="placeholder">Listening...</p>
            {/if}
        </div>

        <div class="controls">
            <button class="stop-btn" onclick={done}>
                {#if recognizing}
                   ⏹ Stop & Analyze
                {:else}
                   Analyze
                {/if}
            </button>
            <button class="close-btn" onclick={close}>Cancel</button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(8px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .voice-modal {
        width: 90%;
        max-width: 400px;
        background: black;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 30px;
        padding: 30px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
    }

    .visualizer {
        width: 100%;
        height: 150px;
    }

    .transcript-box {
        width: 100%;
        min-height: 80px;
        max-height: 200px;
        overflow-y: auto;
        text-align: center;
        font-size: 1.2rem;
        color: white;
    }

    .placeholder {
        color: rgba(255,255,255,0.5);
        font-style: italic;
    }

    .controls {
        display: flex;
        gap: 15px;
        width: 100%;
    }

    button {
        flex: 1;
        padding: 15px;
        border-radius: 99px;
        font-size: 1rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
    }

    .stop-btn {
        background: white;
        color: black;
    }
    
    .close-btn {
        background: rgba(255,255,255,0.1);
        color: white;
    }
</style>
