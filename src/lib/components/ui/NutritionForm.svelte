<script lang="ts">
  import { slide } from 'svelte/transition';
  import NutrientInput from './NutrientInput.svelte';

  interface Props {
      metrics: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          details?: {
            saturatedFat?: number;
            transFat?: number;
            cholesterol?: number;
            sodium?: number;
            potassium?: number;
            calcium?: number;
            iron?: number;
            fiber?: number;
            sugar?: number;
            addedSugar?: number;
            caffeine?: number;
            alcohol?: number;
          };
      };
      readOnly?: boolean;
  }

  let { metrics = $bindable(), readOnly = false }: Props = $props();

  let showDetails = $state(false);

  // Initialize details if missing
  if (!metrics.details) {
      metrics.details = {};
  }

  function updateDetail(macro: 'carbs' | 'fat' | null, field: keyof NonNullable<typeof metrics.details>, newVal: number, oldVal?: number) {
      if (readOnly) return;
      const safeOld = oldVal || 0;
      const safeNew = newVal || 0;
      const delta = safeNew - safeOld;

      metrics.details![field] = newVal;

      if (macro && delta !== 0) {
          metrics[macro] = Math.max(0, (metrics[macro] || 0) + delta);
      }
  }

  // Direct handlers for macros (no delta logic needed, just bind)
  function updateMacro(macro: 'calories' | 'protein' | 'carbs' | 'fat', val: number) {
      if (readOnly) return;
      metrics[macro] = val;
  }
</script>

<div class="nutrition-form">
  <!-- Top Level: Calories & Protein -->
  <div class="top-row">
      <div class="primary-macro">
        <NutrientInput 
            label="Calories" 
            unit="" 
            value={metrics.calories} 
            onupdate={(v) => updateMacro('calories', v)}
            class="highlight-large"
            readonly={readOnly}
        />
      </div>
      <div class="primary-macro">
         <NutrientInput 
            label="Protein" 
            value={metrics.protein} 
            onupdate={(v) => updateMacro('protein', v)}
            class="highlight-large"
            readonly={readOnly}
         />
      </div>
  </div>

  <div class="divider"></div>

  <!-- Carbs Section -->
  <div class="group-section">
      <div class="group-header">
          <span class="group-title">Carbohydrates</span>
          <NutrientInput 
            value={metrics.carbs} 
            onupdate={(v) => updateMacro('carbs', v)}
            class="total-input"
            readonly={readOnly}
            aria-label="Carbohydrates"
          />
      </div>
      
      {#if showDetails}
        <div class="sub-grid">
            <NutrientInput 
                label="Fiber" 
                value={metrics.details?.fiber} 
                onupdate={(v, old) => updateDetail('carbs', 'fiber', v, old)}
                readonly={readOnly}
            />
            <NutrientInput 
                label="Sugar" 
                value={metrics.details?.sugar} 
                onupdate={(v, old) => updateDetail('carbs', 'sugar', v, old)}
                readonly={readOnly}
            />
            <NutrientInput 
                label="Added Sugar" 
                value={metrics.details?.addedSugar} 
                onupdate={(v, old) => updateDetail('carbs', 'addedSugar', v, old)}
                readonly={readOnly}
            />
        </div>
      {/if}
  </div>

  <!-- Fat Section -->
  <div class="group-section">
      <div class="group-header">
          <span class="group-title">Fats</span>
          <NutrientInput 
            value={metrics.fat} 
            onupdate={(v) => updateMacro('fat', v)}
            class="total-input"
            readonly={readOnly}
            aria-label="Fats"
          />
      </div>
      
      {#if showDetails}
        <div class="sub-grid">
            <NutrientInput 
                label="Saturated" 
                value={metrics.details?.saturatedFat} 
                onupdate={(v, old) => updateDetail('fat', 'saturatedFat', v, old)}
                readonly={readOnly}
            />
            <NutrientInput 
                label="Trans" 
                value={metrics.details?.transFat} 
                onupdate={(v, old) => updateDetail('fat', 'transFat', v, old)}
                readonly={readOnly}
            />
            <NutrientInput 
                label="Cholesterol" 
                unit="mg"
                value={metrics.details?.cholesterol} 
                onupdate={(v, old) => updateDetail(null, 'cholesterol', v, old)}
                readonly={readOnly}
            />
        </div>
      {/if}
  </div>

  <button class="details-toggle" onclick={() => showDetails = !showDetails}>
      {showDetails ? 'Hide Detailed Inputs' : 'Show Detailed Inputs'}
  </button>

  {#if showDetails}
      <div class="other-section">
          <div class="section-label">Micros & Other</div>
          <div class="sub-grid">
             <NutrientInput 
                label="Sodium" 
                unit="mg"
                value={metrics.details?.sodium} 
                onupdate={(v, old) => updateDetail(null, 'sodium', v, old)}
                readonly={readOnly}
            />
            <NutrientInput 
                label="Potassium" 
                unit="mg"
                value={metrics.details?.potassium} 
                onupdate={(v, old) => updateDetail(null, 'potassium', v, old)}
                readonly={readOnly}
            />
             <NutrientInput 
                label="Calcium" 
                unit="mg"
                value={metrics.details?.calcium} 
                onupdate={(v, old) => updateDetail(null, 'calcium', v, old)}
                readonly={readOnly}
            />
             <NutrientInput 
                label="Iron" 
                unit="mg"
                value={metrics.details?.iron} 
                onupdate={(v, old) => updateDetail(null, 'iron', v, old)}
                readonly={readOnly}
            />
            <NutrientInput 
                label="Caffeine" 
                unit="mg"
                value={metrics.details?.caffeine} 
                onupdate={(v, old) => updateDetail(null, 'caffeine', v, old)}
                readonly={readOnly}
            />
             <NutrientInput 
                label="Alcohol" 
                value={metrics.details?.alcohol} 
                onupdate={(v, old) => updateDetail(null, 'alcohol', v, old)}
                readonly={readOnly}
            />
          </div>
      </div>
  {/if}

</div>

<style>
  .nutrition-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 10px;
      background: rgba(0,0,0,0.1);
      border-radius: 16px;
  }

  .top-row {
      display: flex;
      justify-content: space-around;
      gap: 20px;
      padding-bottom: 5px;
  }

  .divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      width: 100%;
  }

  .group-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
  }

  .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 5px;
  }

  .group-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary, #aaa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
  }

  .sub-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 10px 15px;
      padding: 10px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
  }

  .details-toggle {
      background: none;
      border: none;
      color: var(--color-primary, #4caf50);
      font-size: 0.85rem;
      cursor: pointer;
      align-self: center;
      padding: 8px;
      opacity: 0.9;
  }

  .other-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .section-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      padding-left: 5px;
  }

  /* Specific overrides via global or deep selectors if Component didn't expose class */
  :global(.highlight-large .gram-input) {
      font-size: 1.2rem !important;
      width: 5ch !important;
      font-weight: bold;
      color: var(--text-accent, #fff) !important;
  }
  
  :global(.total-input .gram-input) {
      font-weight: bold;
      background: rgba(255,255,255,0.15) !important;
  }
</style>
