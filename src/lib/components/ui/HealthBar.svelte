<script lang="ts">
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';

    interface Props {
        label: string;
        value: number;
        target: number;
        unit: string;
        gradientStart: string;
        gradientEnd: string;
        isLimit?: boolean; // If true, turning red when over target (Sodium)
        onclick?: () => void;
        fullBleed?: boolean;
    }

    let {
        label,
        value,
        target,
        unit,
        gradientStart,
        gradientEnd,
        isLimit = false,
        onclick,
        fullBleed = false
    }: Props = $props();

    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const displayedValue = tweened(value, {
        duration: reducedMotion ? 0 : 800,
        easing: cubicOut
    });

    $effect(() => {
        displayedValue.set(value);
    });

    const progress = $derived(Math.min(($displayedValue / target) * 100, 100));
    const isOverLimit = $derived(isLimit && value > target);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="health-bar-container" 
    class:clickable={!!onclick}
    class:full-bleed={fullBleed}
    {onclick}
>
    <div class="header">
        <span class="label">{label}</span>
        <span class="value">{Math.round($displayedValue)} / {target}{unit}</span>
    </div>
    <div class="bar-bg">
        <div 
            class="bar-fill" 
            style="width: {progress}%; background: {isOverLimit ? 'linear-gradient(90deg, #ff416c, #ff4b2b)' : `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`}"
        ></div>
    </div>
</div>

<style>
    .health-bar-container {
        width: 100%;
        margin-bottom: 12px;
    }

    .health-bar-container.full-bleed {
        margin-bottom: 8px;
    }

    .health-bar-container.clickable {
        cursor: pointer;
    }

    .health-bar-container.clickable:hover .bar-bg {
        border-color: rgba(255, 255, 255, 0.2);
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .full-bleed .header {
        padding: 0 24px;
    }

    .label {
        color: var(--text-secondary);
    }

    .value {
        color: var(--text-primary);
    }

    .bar-bg {
        width: 100%;
        height: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 5px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .full-bleed .bar-bg {
        border-radius: 0;
        border-left: none;
        border-right: none;
        height: 8px;
    }

    .bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.3s ease-out;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    }

    .full-bleed .bar-fill {
        border-radius: 0 4px 4px 0;
    }

    @media (prefers-reduced-motion: reduce) {
        .bar-fill {
            transition: none !important;
        }
    }
</style>
