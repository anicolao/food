<script lang="ts">
    import { store, selectMacroTargetsGrams } from '$lib/store';
    import { getMetricEMASeries } from '$lib/metrics';
    import MetricEMAChart from './MetricEMAChart.svelte';

    interface Props {
        selectedDate: string;
        chartWidth?: number;
        chartHeight?: number;
        columns?: number;
        fitToHeight?: number;
    }

    let { selectedDate, chartWidth = 160, chartHeight = 60, columns, fitToHeight }: Props = $props();

    let state = $state(store.getState());

    // Update state when store changes
    $effect(() => {
        const unsubscribe = store.subscribe(() => {
            state = store.getState();
        });
        return unsubscribe;
    });

    let macroTargets = $derived(selectMacroTargetsGrams(state));
    let settings = $derived(state.settings);
    let stats = $derived(state.projections.stats);

    // Helper for micro-metrics
    interface MicroMetricConfig {
        key: string;
        label: string;
        color: string;
        unit: string;
        settingsKey: keyof import('$lib/store').SettingsState;
        isLimit?: boolean;
    }

    const microConfigs: MicroMetricConfig[] = [
        { key: 'totalFiber', label: 'Fiber', color: '#81c784', unit: 'g', settingsKey: 'fiberGoal' },
        { key: 'totalSodium', label: 'Sodium', color: '#e57373', unit: 'mg', settingsKey: 'sodiumGoal', isLimit: true },
        { key: 'totalSugar', label: 'Sugar', color: '#ba68c8', unit: 'g', settingsKey: 'sugarLimit', isLimit: true },
        { key: 'totalAddedSugar', label: 'Added Sugar', color: '#f06292', unit: 'g', settingsKey: 'addedSugarLimit', isLimit: true },
        { key: 'totalSaturatedFat', label: 'Sat. Fat', color: '#ffb74d', unit: 'g', settingsKey: 'satFatLimit', isLimit: true },
        { key: 'totalTransFat', label: 'Trans Fat', color: '#ff8a65', unit: 'g', settingsKey: 'transFatLimit', isLimit: true },
        { key: 'totalCholesterol', label: 'Cholesterol', color: '#90a4ae', unit: 'mg', settingsKey: 'cholesterolLimit', isLimit: true }
    ];

    function getSubTarget(valuePer1000: number) {
        return Math.round((settings.targetCalories / 1000) * valuePer1000);
    }

    let activeMicros = $derived.by(() => {
        return microConfigs
            .filter(config => {
                const setting = settings[config.settingsKey];
                return typeof setting === 'object' && setting !== null && 'enabled' in setting && setting.enabled;
            })
            .map(config => {
                const setting = settings[config.settingsKey] as { value: number; enabled: boolean };
                
                // Some limits are per 1000kcal, others are absolute
                const value = (config.key === 'totalFiber' || config.key === 'totalSodium') 
                    ? setting.value 
                    : getSubTarget(setting.value);

                return {
                    ...config,
                    data: getMetricEMASeries(stats, config.key, selectedDate, 30, 7),
                    target: !config.isLimit ? value : undefined,
                    limit: config.isLimit ? value : undefined
                };
            });
    });

    // Core series - use 7-day EMA
    let caloriesData = $derived(getMetricEMASeries(stats, 'totalCalories', selectedDate, 30, 7));
    let proteinData = $derived(getMetricEMASeries(stats, 'totalProtein', selectedDate, 30, 7));
    let carbsData = $derived(getMetricEMASeries(stats, 'totalCarbs', selectedDate, 30, 7));
    let fatData = $derived(getMetricEMASeries(stats, 'totalFat', selectedDate, 30, 7));

    let totalCharts = $derived(4 + activeMicros.length);
    
    // Calculate dynamic height if fitToHeight is provided
    let dynamicChartHeight = $derived.by(() => {
        if (!fitToHeight) return chartHeight;
        
        // We need to estimate rows. If columns not provided, we estimate based on width
        // But for mobile flip card, columns is usually 2.
        const cols = columns || 2;
        const rows = Math.ceil(totalCharts / cols);
        const containerGap = 12;
        const cardOverhead = 46; // Padding (20) + Header (~20) + Gap (6)
        
        const availableTotalHeight = fitToHeight - (rows - 1) * containerGap;
        const perCardHeight = availableTotalHeight / rows;
        const calculatedHeight = perCardHeight - cardOverhead;
        
        // Ensure it doesn't get TOO small or TOO large
        return Math.max(30, Math.min(200, calculatedHeight));
    });

    let isCompact = $derived(dynamicChartHeight < 50);
</script>

<div class="ema-container" style="grid-template-columns: {columns ? `repeat(${columns}, 1fr)` : 'repeat(auto-fill, minmax(170px, 1fr))'}">
    <MetricEMAChart label="Calories" data={caloriesData} target={settings.targetCalories} color="#43e97b" unit="kcal" width={chartWidth} height={dynamicChartHeight} compact={isCompact} />
    <MetricEMAChart label="Protein" data={proteinData} target={macroTargets.protein} color="#c471ed" unit="g" width={chartWidth} height={dynamicChartHeight} compact={isCompact} />
    <MetricEMAChart label="Carbs" data={carbsData} target={macroTargets.carbs} color="#24c6dc" unit="g" width={chartWidth} height={dynamicChartHeight} compact={isCompact} />
    <MetricEMAChart label="Fat" data={fatData} target={macroTargets.fat} color="#D1913C" unit="g" width={chartWidth} height={dynamicChartHeight} compact={isCompact} />
    
    {#each activeMicros as micro}
        <MetricEMAChart 
            label={micro.label} 
            data={micro.data} 
            target={micro.target}
            limit={micro.limit}
            color={micro.color} 
            unit={micro.unit} 
            width={chartWidth}
            height={dynamicChartHeight}
            compact={isCompact}
        />
    {/each}
</div>

<style>
    .ema-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 12px;
        width: 100%;
    }

    @media (max-width: 1023px) {
        .ema-container {
            /* On mobile, we might want a slightly different layout if it's toggled */
            padding: 4px;
        }
    }
</style>
