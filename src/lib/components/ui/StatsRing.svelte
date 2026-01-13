<script lang="ts">
    interface Props {
        value: number;
        max: number;
        size?: number;
        strokeWidth?: number;
        color?: string; // Hex or CSS variable
        gradientId?: string; // ID of a gradient defined elsewhere or inline
        label?: string;
        suffix?: string;
    }

    let {
        value,
        max,
        size = 120,
        strokeWidth = 8,
        color = '#ff6b6b',
        gradientId,
        label = '',
        suffix = ''
    }: Props = $props();

    const radius = $derived((size - strokeWidth) / 2);
    const circumference = $derived(2 * Math.PI * radius);
    const progress = $derived(Math.min(Math.max(value / max, 0), 1));
    const dashOffset = $derived(circumference * (1 - progress));
</script>

<div class="stats-ring-container" style="width: {size}px; height: {size}px;">
    <svg width={size} height={size} viewBox="0 0 {size} {size}" class="stats-ring-svg">
        <!-- Background Circle -->
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width={strokeWidth}
        />
        
        <!-- Progress Circle -->
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gradientId ? `url(#${gradientId})` : color}
            stroke-width={strokeWidth}
            stroke-dasharray={circumference}
            stroke-dashoffset={dashOffset}
            stroke-linecap="round"
            class="progress-circle"
            transform="rotate(-90 {size/2} {size/2})"
        />

        <!-- Inline defs if needed, though usually global or passed in is better -->
        {#if gradientId === 'calories-ring'}
             <defs>
                <linearGradient id="calories-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FF9966"/>
                    <stop offset="100%" stop-color="#FF5E62"/>
                </linearGradient>
            </defs>
        {/if}
    </svg>

    <div class="content">
        {#if label}
            <span class="label">{label}</span>
        {/if}
        <span class="value-text">
            {Math.round(value)}{suffix}
        </span>
        <span class="max-text">/ {max}</span>
    </div>
</div>

<style>
    .stats-ring-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .stats-ring-svg {
        position: absolute;
        top: 0;
        left: 0;
    }

    .progress-circle {
        transition: stroke-dashoffset 1s ease-out;
    }

    .content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }

    .label {
        font-size: 0.8rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
    }

    .value-text {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--text-primary);
        line-height: 1;
    }

    .max-text {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-top: 2px;
    }
</style>
