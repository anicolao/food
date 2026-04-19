<script lang="ts">
    import HealthBar from './HealthBar.svelte';
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
    }

    let { stats }: Props = $props();
    let settings = $state(store.getState().settings);

    $effect(() => {
        const unsubscribe = store.subscribe(() => {
            settings = store.getState().settings;
        });
        return unsubscribe;
    });

    function getSubTarget(valuePer1000: number) {
        return Math.round((settings.targetCalories / 1000) * valuePer1000);
    }
</script>

<div class="health-summary">
    {#if settings.fiberGoal.enabled}
        <HealthBar 
            label="Fiber" 
            value={stats.totalFiber} 
            target={settings.fiberGoal.value} 
            unit="g" 
            gradientStart="#00f2fe" 
            gradientEnd="#4facfe" 
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
        />
    {/if}
</div>

<style>
    .health-summary {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 16px;
        gap: 4px;
    }
</style>
