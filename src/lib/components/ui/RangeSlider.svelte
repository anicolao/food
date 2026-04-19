<script lang="ts">
    interface Props {
        min: number;
        max: number;
        rangeMin: number;
        rangeMax: number;
        step?: number;
        onchange: (min: number, max: number) => void;
        accentColor?: string;
    }

    let { 
        min = $bindable(), 
        max = $bindable(), 
        rangeMin, 
        rangeMax, 
        step = 1, 
        onchange,
        accentColor = '#ffca28'
    }: Props = $props();

    function handleMinInput(e: Event) {
        const value = Number((e.target as HTMLInputElement).value);
        if (value <= max) {
            min = value;
            onchange(min, max);
        } else {
            min = max;
            (e.target as HTMLInputElement).value = String(max);
            onchange(min, max);
        }
    }

    function handleMaxInput(e: Event) {
        const value = Number((e.target as HTMLInputElement).value);
        if (value >= min) {
            max = value;
            onchange(min, max);
        } else {
            max = min;
            (e.target as HTMLInputElement).value = String(min);
            onchange(min, max);
        }
    }

    const minPct = $derived(((min - rangeMin) / (rangeMax - rangeMin)) * 100);
    const maxPct = $derived(((max - rangeMin) / (rangeMax - rangeMin)) * 100);
</script>

<div class="range-slider-container" style="--accent: {accentColor}">
    <div class="slider-track-bg"></div>
    <div class="slider-track-fill" style="left: {minPct}%; right: {100 - maxPct}%"></div>
    
    <input 
        type="range" 
        min={rangeMin} 
        max={rangeMax} 
        {step} 
        value={min} 
        oninput={handleMinInput}
        class="thumb thumb-left"
    />
    <input 
        type="range" 
        min={rangeMin} 
        max={rangeMax} 
        {step} 
        value={max} 
        oninput={handleMaxInput}
        class="thumb thumb-right"
    />
</div>

<style>
    .range-slider-container {
        position: relative;
        width: 100%;
        height: 40px;
        display: flex;
        align-items: center;
    }

    .slider-track-bg {
        position: absolute;
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }

    .slider-track-fill {
        position: absolute;
        height: 8px;
        background: var(--accent);
        border-radius: 4px;
        opacity: 0.6;
    }

    .thumb {
        position: absolute;
        width: 100%;
        pointer-events: none;
        -webkit-appearance: none;
        appearance: none;
        background: none;
        z-index: 2;
        margin: 0;
    }

    .thumb::-webkit-slider-thumb {
        pointer-events: auto;
        -webkit-appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: white;
        border: 2px solid var(--accent);
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
    }

    .thumb::-moz-range-thumb {
        pointer-events: auto;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: white;
        border: 2px solid var(--accent);
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
    }

    /* Hide the track of the inputs as we use our own */
    .thumb::-webkit-slider-runnable-track {
        background: transparent;
    }
    .thumb::-moz-range-track {
        background: transparent;
    }
</style>
