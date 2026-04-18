<script lang="ts">
    import HealthBar from './HealthBar.svelte';
    
    interface Props {
        fiber: number;
        fiberTarget: number;
        sodium: number;
        sodiumTarget: number;
    }

    let { fiber, fiberTarget, sodium, sodiumTarget }: Props = $props();
</script>

<div class="health-summary glass-panel">
    <HealthBar 
        label="Fiber" 
        value={fiber} 
        target={fiberTarget} 
        unit="g" 
        gradientStart="#43e97b" 
        gradientEnd="#38f9d7" 
    />
    <HealthBar 
        label="Sodium" 
        value={sodium} 
        target={sodiumTarget} 
        unit="mg" 
        gradientStart="#f6d365" 
        gradientEnd="#fda085" 
        isLimit={true}
    />
</div>

<style>
    .health-summary {
        display: flex;
        flex-direction: column;
        padding: 20px;
        margin-top: 16px;
        gap: 4px;
    }
</style>
