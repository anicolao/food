<script lang="ts">
    import HealthBar from './HealthBar.svelte';
    import HealthBreakdownModal from './HealthBreakdownModal.svelte';
    import { store } from '$lib/store';
    
    interface Props {
        stats: {
            totalCalories: number;
            totalProtein: number;
            totalFat: number;
            totalCarbs: number;
            totalFiber: number;
            totalSugar: number;
            totalAddedSugar: number;
            totalSaturatedFat: number;
            totalTransFat: number;
            totalCholesterol: number;
            totalSodium: number;
        };
        logs: any[];
    }

    let { stats, logs }: Props = $props();
    let settings = $state(store.getState().settings);

    let activeBreakdown = $state<{ title: string; key: string; unit: string } | null>(null);

    $effect(() => {
        const unsubscribe = store.subscribe(() => {
            settings = store.getState().settings;
        });
        return unsubscribe;
    });

    function getSubTarget(valuePer1000: number) {
        return Math.round((settings.targetCalories / 1000) * valuePer1000);
    }

    function showBreakdown(title: string, key: string, unit: string) {
        activeBreakdown = { title, key, unit };
    }
</script>

<div class="health-summary">
    <div class="primary-health-metrics">
        {#if settings.fiberGoal.enabled}
            <div class="metric-wrapper">
                <HealthBar 
                    label="Fiber" 
                    value={stats.totalFiber} 
                    target={settings.fiberGoal.value} 
                    unit="g" 
                    gradientStart="#43e97b" 
                    gradientEnd="#38f9d7" 
                    onclick={() => showBreakdown('Fiber', 'fiber', 'g')}
                />
            </div>
        {/if}

        {#if settings.sodiumGoal.enabled}
            <div class="metric-wrapper">
                <HealthBar 
                    label="Sodium" 
                    value={stats.totalSodium} 
                    target={settings.sodiumGoal.value} 
                    unit="mg" 
                    gradientStart="#f6d365" 
                    gradientEnd="#fda085" 
                    isLimit={true}
                    onclick={() => showBreakdown('Sodium', 'sodium', 'mg')}
                />
            </div>
        {/if}
    </div>

    <div class="other-health-metrics">
        {#if settings.sugarLimit.enabled}
            <HealthBar 
                label="Sugar" 
                value={stats.totalSugar} 
                target={getSubTarget(settings.sugarLimit.value)} 
                unit="g" 
                gradientStart="#f6d365" 
                gradientEnd="#fda085" 
                isLimit={true}
                onclick={() => showBreakdown('Sugar', 'sugar', 'g')}
            />
        {/if}

        {#if settings.addedSugarLimit.enabled}
            <HealthBar 
                label="Added Sugar" 
                value={stats.totalAddedSugar} 
                target={getSubTarget(settings.addedSugarLimit.value)} 
                unit="g" 
                gradientStart="#f6d365" 
                gradientEnd="#fda085" 
                isLimit={true}
                onclick={() => showBreakdown('Added Sugar', 'addedSugar', 'g')}
            />
        {/if}

        {#if settings.satFatLimit.enabled}
            <HealthBar 
                label="Sat Fat" 
                value={stats.totalSaturatedFat} 
                target={getSubTarget(settings.satFatLimit.value)} 
                unit="g" 
                gradientStart="#f6d365" 
                gradientEnd="#fda085" 
                isLimit={true}
                onclick={() => showBreakdown('Sat Fat', 'saturatedFat', 'g')}
            />
        {/if}

        {#if settings.transFatLimit.enabled}
            <HealthBar 
                label="Trans Fat" 
                value={stats.totalTransFat} 
                target={getSubTarget(settings.transFatLimit.value)} 
                unit="g" 
                gradientStart="#ff416c" 
                gradientEnd="#ff4b2b" 
                isLimit={true}
                onclick={() => showBreakdown('Trans Fat', 'transFat', 'g')}
            />
        {/if}

        {#if settings.cholesterolLimit.enabled}
            <HealthBar 
                label="Cholesterol" 
                value={stats.totalCholesterol} 
                target={getSubTarget(settings.cholesterolLimit.value)} 
                unit="mg" 
                gradientStart="#f6d365" 
                gradientEnd="#fda085" 
                isLimit={true}
                onclick={() => showBreakdown('Cholesterol', 'cholesterol', 'mg')}
            />
        {/if}
    </div>
</div>

{#if activeBreakdown}
    <HealthBreakdownModal 
        title={activeBreakdown.title}
        logs={logs}
        nutrientKey={activeBreakdown.key}
        unit={activeBreakdown.unit}
        onclose={() => activeBreakdown = null}
    />
{/if}

<style>
    .health-summary {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 16px;
        gap: 4px;
    }

    .primary-health-metrics {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
    }

    .other-health-metrics {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
    }

    .metric-wrapper {
        width: 100%;
    }
</style>
