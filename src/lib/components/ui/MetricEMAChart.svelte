<script lang="ts">
    interface Props {
        label: string;
        data: number[];
        target: number;
        targetRange?: [number, number];
        color: string;
        unit?: string;
    }

    let { label, data, target, targetRange, color, unit = '' }: Props = $props();

    const width = 160;
    const height = 60;
    const padding = 5;

    function getY(v: number, minVal: number, range: number) {
        return height - padding - ((v - minVal) / range) * (height - 2 * padding);
    }

    let points = $derived.by(() => {
        if (data.length === 0) return '';
        
        let allVals = [...data, target];
        if (targetRange) allVals.push(...targetRange);
        
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const range = maxVal - minVal || 1;

        const xStep = (width - 2 * padding) / (data.length - 1 || 1);
        
        return data.map((v, i) => {
            const x = padding + i * xStep;
            const y = getY(v, minVal, range);
            return `${x},${y}`;
        }).join(' ');
    });

    let targetLines = $derived.by(() => {
        let allVals = [...data, target];
        if (targetRange) allVals.push(...targetRange);
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const range = maxVal - minVal || 1;

        const lines = [{ y: getY(target, minVal, range), value: target }];
        if (targetRange) {
            lines.push({ y: getY(targetRange[0], minVal, range), value: targetRange[0] });
            lines.push({ y: getY(targetRange[1], minVal, range), value: targetRange[1] });
        }
        return lines;
    });

    let currentValue = $derived(data.length > 0 ? data[data.length - 1] : 0);

    let hoverIndex = $state<number | null>(null);
    let hoverData = $derived.by(() => {
        if (hoverIndex === null || data.length === 0) return null;
        
        let allVals = [...data, target];
        if (targetRange) allVals.push(...targetRange);
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const range = maxVal - minVal || 1;

        const xStep = (width - 2 * padding) / (data.length - 1 || 1);
        const x = padding + hoverIndex * xStep;
        const y = getY(data[hoverIndex], minVal, range);
        
        return { x, y, value: data[hoverIndex] };
    });

    function handleMouseMove(e: MouseEvent) {
        const svg = e.currentTarget as SVGSVGElement;
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (width / rect.width);
        
        if (x < padding || x > width - padding || data.length < 2) {
            hoverIndex = null;
            return;
        }

        const xStep = (width - 2 * padding) / (data.length - 1);
        const index = Math.round((x - padding) / xStep);
        hoverIndex = Math.max(0, Math.min(data.length - 1, index));
    }

    function handleMouseLeave() {
        hoverIndex = null;
    }
</script>

<div class="chart-card">
    <div class="header">
        <span class="label">{label}</span>
        <span class="value" style="color: {color}">{Math.round(currentValue)}{unit}</span>
    </div>
    <svg 
        {width} {height} viewBox="0 0 {width} {height}"
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
        role="img"
        aria-label="EMA Chart for {label}"
    >
        <defs>
            <filter id="glow-{label.replace(/\s+/g, '-')}" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <!-- Target Lines -->
        {#each targetLines as line}
            <g>
                <line 
                    x1={padding} y1={line.y} x2={width - padding} y2={line.y} 
                    stroke="rgba(255,255,255,0.15)" 
                    stroke-width="1" 
                    stroke-dasharray="4 2" 
                />
                <text 
                    x={width - padding} y={line.y - 2} 
                    text-anchor="end" 
                    font-size="6" 
                    fill="rgba(255,255,255,0.3)"
                    class="target-label"
                >
                    {Math.round(line.value)}
                </text>
            </g>
        {/each}
        
        <!-- EMA Curve -->
        <polyline
            points={points}
            fill="none"
            stroke={color}
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#glow-{label.replace(/\s+/g, '-')})"
        />

        <!-- Hover Indicator -->
        {#if hoverData}
            <line 
                x1={hoverData.x} y1={padding} x2={hoverData.x} y2={height - padding} 
                stroke="rgba(255,255,255,0.2)" 
                stroke-width="1"
            />
            <circle 
                cx={hoverData.x} cy={hoverData.y} r="3" 
                fill={color} 
                stroke="white" 
                stroke-width="1"
            />
            <g transform="translate({hoverData.x}, {hoverData.y < 20 ? hoverData.y + 12 : hoverData.y - 8})">
                <text 
                    text-anchor="middle" 
                    font-size="8" 
                    font-weight="bold" 
                    fill="white"
                    class="hover-value"
                >
                    {Math.round(hoverData.value)}
                </text>
            </g>
        {/if}
    </svg>
</div>

<style>
    .chart-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 170px;
        flex: 1;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .label {
        color: rgba(255, 255, 255, 0.5);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.65rem;
    }
    .value {
        font-weight: 800;
        font-size: 0.95rem;
        font-variant-numeric: tabular-nums;
    }
    svg {
        display: block;
        width: 100%;
        height: auto;
    }
    text, line, circle, polyline {
        pointer-events: none;
    }
</style>
