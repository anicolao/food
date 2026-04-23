<script lang="ts">
    import HealthBar from './HealthBar.svelte';
    import type { SettingsState } from '$lib/store';
    
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
        settings: SettingsState;
        onshowBreakdown?: (title: string, key: string, unit: string) => void;
    }

    let { stats, settings, onshowBreakdown }: Props = $props();

    function getSubTarget(valuePer1000: number) {
        return Math.round((settings.targetCalories / 1000) * valuePer1000);
    }

    const hasEnabledMetrics = $derived(
        settings.fiberGoal.enabled ||
        settings.sodiumGoal.enabled ||
        settings.sugarLimit.enabled ||
        settings.addedSugarLimit.enabled ||
        settings.satFatLimit.enabled ||
        settings.transFatLimit.enabled ||
        settings.cholesterolLimit.enabled
    );
</script>

{#if hasEnabledMetrics}
    <div class="health-summary">
        {#if settings.fiberGoal.enabled}
            <HealthBar 
                label="Fiber" 
                value={stats.totalFiber} 
                target={settings.fiberGoal.value} 
                unit="g" 
                gradientStart="#43e97b" 
                gradientEnd="#38f9d7" 
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Fiber', 'fiber', 'g')}
            />
        {/if}

        {#if settings.sodiumGoal.enabled}
            <HealthBar 
                label="Sodium" 
                value={stats.totalSodium} 
                target={settings.sodiumGoal.value} 
                unit="mg" 
                gradientStart="#f6d365" 
                gradientEnd="#fda085" 
                isLimit={true}
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Sodium', 'sodium', 'mg')}
            />
        {/if}

        {#if settings.sugarLimit.enabled}
            <HealthBar 
                label="Sugar" 
                value={stats.totalSugar} 
                target={getSubTarget(settings.sugarLimit.value)} 
                unit="g" 
                gradientStart="#f6d365" 
                gradientEnd="#fda085" 
                isLimit={true}
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Sugar', 'sugar', 'g')}
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
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Added Sugar', 'addedSugar', 'g')}
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
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Sat Fat', 'saturatedFat', 'g')}
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
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Trans Fat', 'transFat', 'g')}
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
                fullBleed={true}
                onclick={() => onshowBreakdown?.('Cholesterol', 'cholesterol', 'mg')}
            />
        {/if}
    </div>
{/if}

<style>
    .health-summary {
        display: flex;
        flex-direction: column;
        width: calc(100% + 48px);
        margin: 16px -24px -24px -24px;
        padding: 16px 0;
        gap: 4px;
        background: rgba(0, 0, 0, 0.15);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        box-sizing: border-box;
    }
</style>

