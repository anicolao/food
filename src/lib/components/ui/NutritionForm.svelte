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

  function updateDetail(macro: 'carbs' | 'fat' | null, field: keyof NonNullable<typeof metrics.details>, newVal: number) {
      if (readOnly) return;
      
      metrics.details![field] = newVal;

      if (!macro) return;

      // Logic: The Total is a "Floor" for the sum of its components.
      // If Sum(Components) > Total, bump Total.
      // Otherwise, leave Total alone (it implies "Other" components exist).

      let sumComponents = 0;
      if (macro === 'carbs') {
         // Sum Fiber + Sugar
         const d = metrics.details || {};
         sumComponents = (d.fiber || 0) + (d.sugar || 0);
      } else if (macro === 'fat') {
         // Sum Saturated + Trans
         const d = metrics.details || {};
         sumComponents = (d.saturatedFat || 0) + (d.transFat || 0); 
      }

      if (sumComponents > metrics[macro]) {
          metrics[macro] = sumComponents;
      }
  }

  // Direct handlers for macros
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
        <div class="detail-list">
            <NutrientInput 
                layout="horizontal"
                label="Fiber" 
                value={metrics.details?.fiber} 
                onupdate={(v) => updateDetail('carbs', 'fiber', v)}
                readonly={readOnly}
            />
            <NutrientInput 
                layout="horizontal"
                label="Sugar" 
                value={metrics.details?.sugar} 
                onupdate={(v) => updateDetail('carbs', 'sugar', v)}
                readonly={readOnly}
            />
            <NutrientInput 
                layout="horizontal"
                label="Added Sugar" 
                value={metrics.details?.addedSugar} 
                onupdate={(v) => updateDetail('carbs', 'addedSugar', v)}
                readonly={readOnly}
                class="indented" 
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
        <div class="detail-list">
            <NutrientInput 
                layout="horizontal"
                label="Saturated" 
                value={metrics.details?.saturatedFat} 
                onupdate={(v) => updateDetail('fat', 'saturatedFat', v)}
                readonly={readOnly}
            />
            <NutrientInput 
                layout="horizontal"
                label="Trans" 
                value={metrics.details?.transFat} 
                onupdate={(v) => updateDetail('fat', 'transFat', v)}
                readonly={readOnly}
            />
            <NutrientInput 
                layout="horizontal"
                label="Cholesterol" 
                unit="mg"
                value={metrics.details?.cholesterol} 
                onupdate={(v) => updateDetail(null, 'cholesterol', v)}
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
          <div class="detail-list">
             <NutrientInput 
                layout="horizontal"
                label="Sodium" 
                unit="mg"
                value={metrics.details?.sodium} 
                onupdate={(v) => updateDetail(null, 'sodium', v)}
                readonly={readOnly}
            />
            <NutrientInput 
                layout="horizontal"
                label="Potassium" 
                unit="mg"
                value={metrics.details?.potassium} 
                onupdate={(v) => updateDetail(null, 'potassium', v)}
                readonly={readOnly}
            />
             <NutrientInput 
                layout="horizontal"
                label="Calcium" 
                unit="mg"
                value={metrics.details?.calcium} 
                onupdate={(v) => updateDetail(null, 'calcium', v)}
                readonly={readOnly}
            />
             <NutrientInput 
                layout="horizontal"
                label="Iron" 
                unit="mg"
                value={metrics.details?.iron} 
                onupdate={(v) => updateDetail(null, 'iron', v)}
                readonly={readOnly}
            />
            <NutrientInput 
                layout="horizontal"
                label="Caffeine" 
                unit="mg"
                value={metrics.details?.caffeine} 
                onupdate={(v) => updateDetail(null, 'caffeine', v)}
                readonly={readOnly}
            />
             <NutrientInput 
                layout="horizontal"
                label="Alcohol" 
                value={metrics.details?.alcohol} 
                onupdate={(v) => updateDetail(null, 'alcohol', v)}
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
      padding-bottom: 20px;
      /* background: rgba(0,0,0,0.1); remove background to blend better or keep? User didn't complain about bg.*/
      background: rgba(0,0,0,0.2);
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
      gap: 5px;
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

  .detail-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 5px 10px;
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
  
  /* Indent Added Sugar visually */
  :global(.indented) {
      margin-left: 15px; 
      width: calc(100% - 15px) !important;
  }

  /* Specific overrides via global or deep selectors if Component didn't expose class */
  :global(.highlight-large .gram-input) {
      font-size: 1.4rem !important;
      width: 5ch !important;
      font-weight: bold;
      color: var(--text-accent, #fff) !important;
      padding: 8px !important;
  }
  
  :global(.total-input .gram-input) {
      font-weight: bold;
      background: rgba(255,255,255,0.15) !important;
  }
</style>
