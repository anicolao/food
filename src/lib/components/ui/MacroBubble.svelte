<script lang="ts">
    import { base } from '$app/paths';

    interface Props {
        label: string;
        value: number;
        max: number;
        color?: string; // Hex for glow/stroke
        unit?: string;
        iconSrc?: string; // Path to image
        gradientId?: string; // If using gradient stroke
    }

    let { 
        label, 
        value, 
        max, 
        color = '#ffffff', 
        unit = 'g', 
        iconSrc,
        gradientId
    }: Props = $props();
    
    // Fatter ring
    const size = 100; // Larger to fit content
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = $derived(Math.min(Math.max(value / max, 0.01), 1)); // Min 0.01 to show something
    
    // Calculate arc path for progress
    // Start at -90deg (top)
    const startAngle = -Math.PI / 2;
    const endAngle = $derived(startAngle + (progress * 2 * Math.PI));
    
    // Helper to get coordinates
    const getCoords = (a: number) => ({
        x: size/2 + radius * Math.cos(a),
        y: size/2 + radius * Math.sin(a)
    });

    const start = getCoords(startAngle);
    const end = $derived(getCoords(endAngle));
    const largeArc = $derived(progress > 0.5 ? 1 : 0);
    
    // Path for the progress arc
    const arcPath = $derived(`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`);
    
    const percent = $derived(Math.round((value/max) * 100));
</script>

<div class="macro-bubble">
    <div class="ring-wrapper" style="width: {size}px; height: {size}px;">
        <svg width={size} height={size} viewBox="0 0 {size} {size}" class="ring-svg">
            <defs>
                 <filter id="glow-{label}" x="-50%" y="-50%" width="200%" height="200%">
                   <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                   <feMerge>
                       <feMergeNode in="coloredBlur"/>
                       <feMergeNode in="SourceGraphic"/>
                   </feMerge>
                </filter>
                 <!-- Path definition for text alignment if needed separately -->
                 <path id="path-{label}" d={arcPath} />
            </defs>

             <!-- Background Circle -->
             <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                stroke-width={strokeWidth}
            />
            
             <!-- Progress Path -->
             <!-- We use a path instead of circle for 'd' attribute access if needed, 
                  but stroke-dasharray on circle is smoother for animation usually.
                  However, for textPath 'href', we need a path in defs. 
                  Let's use the path for drawing too to ensure exact match. 
             -->
             <path
                d={arcPath}
                fill="none"
                stroke={gradientId ? `url(#${gradientId})` : color}
                stroke-width={strokeWidth}
                stroke-linecap="round"
                filter="url(#glow-{label})"
                class="progress-path"
            />
            
            <!-- Percentage at Tip (Rotated along path) -->
            <!-- startOffset="100%" puts it at the end. 
                 text-anchor="end" aligns the end of the text to that point. 
                 dy gives vertical offset to center in stroke. 
                 Using tiny black letters.
            -->
            <text dy="3" fill="#000" font-size="9" font-weight="900" style="pointer-events: none;">
                <textPath 
                    href="#path-{label}" 
                    startOffset="100%" 
                    text-anchor="end"
                    spacing="auto"
                >
                    {percent}%&nbsp;
                </textPath>
            </text>
        </svg>
        
        <!-- Internal Content: Icon, Label, Value -->
        <div class="inner-content">
            {#if iconSrc}
                <img src="{base}{iconSrc}" alt={label} class="macro-icon" />
            {/if}
            <div class="stats">
                <span class="bubble-label">{label}</span>
                <span class="bubble-value">{Math.round(value)}/{max}</span>
            </div>
        </div>
    </div>
</div>

<style>
    .macro-bubble {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .ring-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .ring-svg {
        position: absolute;
        top: 0; 
        left: 0;
        overflow: visible;
    }

    .progress-path {
        transition: d 0.5s ease-out;
    }
    
    .inner-content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 70%; 
        height: 70%;
        gap: 2px;
    }
    
    .macro-icon {
        width: 24px;
        height: 24px;
        object-fit: contain;
        margin-bottom: 2px;
    }
    
    .stats {
        display: flex;
        flex-direction: column;
        line-height: 1;
    }
    
    .bubble-label {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-secondary);
        letter-spacing: 0.05em;
    }
    
    .bubble-value {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-primary);
    }
</style>
