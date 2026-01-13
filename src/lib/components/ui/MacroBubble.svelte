<script lang="ts">
    interface Props {
        label: string;
        value: number;
        max: number;
        color?: string;
        unit?: string;
    }

    let { label, value, max, color = '#ffffff', unit = 'g' }: Props = $props();
    
    // Simple bar or mini-ring? Let's go with a mini-ring approach similar to Apple Fitness rings
    // but simplified to a bubble with a ring border.
    
    const size = 60;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(value / max, 0), 1);
    const dashOffset = circumference * (1 - progress);
</script>

<div class="macro-bubble">
    <div class="ring-wrapper" style="width: {size}px; height: {size}px;">
        <svg width={size} height={size} viewBox="0 0 {size} {size}">
             <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                stroke-width={strokeWidth}
            />
             <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                stroke-width={strokeWidth}
                stroke-dasharray={circumference}
                stroke-dashoffset={dashOffset}
                stroke-linecap="round"
                transform="rotate(-90 {size/2} {size/2})"
            />
        </svg>
        <div class="bubble-content">
             <span class="bubble-value">{Math.round(value)}</span>
             <span class="bubble-unit">{unit}</span>
        </div>
    </div>
    <span class="bubble-label" style="color: {color}">{label}</span>
</div>

<style>
    .macro-bubble {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
    }
    
    .ring-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    svg {
        position: absolute;
        top: 0; 
        left: 0;
    }
    
    .bubble-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
    }
    
    .bubble-value {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
    }
    
    .bubble-unit {
        font-size: 0.6rem;
        color: var(--text-secondary);
    }
    
    .bubble-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
