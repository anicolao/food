<script lang="ts">
    import { store, selectMacroTargetsGrams } from '$lib/store';
    import { getMetricEMASeries } from '$lib/metrics';
    import MetricEMAChart from './MetricEMAChart.svelte';

    interface Props {
        selectedDate: string;
    }

    let { selectedDate }: Props = $props();

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
    }

    const microConfigs: MicroMetricConfig[] = [
        { key: 'totalFiber', label: 'Fiber', color: '#81c784', unit: 'g', settingsKey: 'fiberGoal' },
        { key: 'totalSodium', label: 'Sodium', color: '#e57373', unit: 'mg', settingsKey: 'sodiumGoal' },
        { key: 'totalSugar', label: 'Sugar', color: '#ba68c8', unit: 'g', settingsKey: 'sugarLimit' },
        { key: 'totalAddedSugar', label: 'Added Sugar', color: '#f06292', unit: 'g', settingsKey: 'addedSugarLimit' },
        { key: 'totalSaturatedFat', label: 'Sat. Fat', color: '#ffb74d', unit: 'g', settingsKey: 'satFatLimit' },
        { key: 'totalTransFat', label: 'Trans Fat', color: '#ff8a65', unit: 'g', settingsKey: 'transFatLimit' },
        { key: 'totalCholesterol', label: 'Cholesterol', color: '#90a4ae', unit: 'mg', settingsKey: 'cholesterolLimit' }
    ];

    let activeMicros = $derived.by(() => {
        return microConfigs
            .filter(config => {
                const setting = settings[config.settingsKey];
                return typeof setting === 'object' && setting !== null && 'enabled' in setting && setting.enabled;
            })
            .map(config => {
                const setting = settings[config.settingsKey] as { value: number; enabled: boolean };
                return {
                    ...config,
                    data: getMetricEMASeries(stats, config.key, selectedDate),
                    target: setting.value
                };
            });
    });

    // Core series
    let caloriesData = $derived(getMetricEMASeries(stats, 'totalCalories', selectedDate));
    let proteinData = $derived(getMetricEMASeries(stats, 'totalProtein', selectedDate));
    let carbsData = $derived(getMetricEMASeries(stats, 'totalCarbs', selectedDate));
    let fatData = $derived(getMetricEMASeries(stats, 'totalFat', selectedDate));
</script>

<div class="ema-container">
    <MetricEMAChart label="Calories" data={caloriesData} target={settings.targetCalories} color="#43e97b" unit="kcal" />
    <MetricEMAChart label="Protein" data={proteinData} target={macroTargets.protein} color="#c471ed" unit="g" />
    <MetricEMAChart label="Carbs" data={carbsData} target={macroTargets.carbs} color="#24c6dc" unit="g" />
    <MetricEMAChart label="Fat" data={fatData} target={macroTargets.fat} color="#D1913C" unit="g" />
    
    {#each activeMicros as micro}
        <MetricEMAChart 
            label={micro.label} 
            data={micro.data} 
            target={micro.target} 
            color={micro.color} 
            unit={micro.unit} 
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
