<script lang="ts">
  import { slide } from 'svelte/transition';

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
</script>

<div class="nutrition-form">
  <!-- Core Macros -->
  <div class="macros-row">
      <div class="macro-field">
          <label>Cals
            <input type="number" bind:value={metrics.calories} class="bg-input highlight-cal" readonly={readOnly} />
          </label>
      </div>
      <div class="macro-field">
          <label>Prot
            <input type="number" bind:value={metrics.protein} class="bg-input" readonly={readOnly} />
          </label>
      </div>
      <div class="macro-field">
          <label>Carb
            <input type="number" bind:value={metrics.carbs} class="bg-input" readonly={readOnly} />
          </label>
      </div>
      <div class="macro-field">
          <label>Fat
            <input type="number" bind:value={metrics.fat} class="bg-input" readonly={readOnly} />
          </label>
      </div>
  </div>

  <!-- Toggle for Detailed View -->
  <button class="details-toggle" onclick={() => showDetails = !showDetails}>
      {showDetails ? 'Hide Details' : 'Show Details (Vitamins, Minerals, Sub-macros)'}
  </button>

  {#if showDetails && metrics.details}
      <div class="details-grid" transition:slide>
          
          <!-- Fats Breakdown -->
          <div class="section-title">Fats</div>
          <div class="detail-row">
              <label>Saturated (g)
                  <input type="number" bind:value={metrics.details.saturatedFat} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Trans (g)
                  <input type="number" bind:value={metrics.details.transFat} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Cholesterol (mg)
                  <input type="number" bind:value={metrics.details.cholesterol} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
          </div>

          <!-- Carbs Breakdown -->
          <div class="section-title">Carbohydrates</div>
          <div class="detail-row">
              <label>Fiber (g)
                  <input type="number" bind:value={metrics.details.fiber} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Sugar (g)
                  <input type="number" bind:value={metrics.details.sugar} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Added Sugar (g)
                  <input type="number" bind:value={metrics.details.addedSugar} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
          </div>

          <!-- Micros & Electrolytes -->
          <div class="section-title">Micros</div>
          <div class="detail-row">
              <label>Sodium (mg)
                  <input type="number" bind:value={metrics.details.sodium} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Potassium (mg)
                  <input type="number" bind:value={metrics.details.potassium} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
          </div>
          <div class="detail-row">
              <label>Calcium (mg)
                  <input type="number" bind:value={metrics.details.calcium} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Iron (mg)
                  <input type="number" bind:value={metrics.details.iron} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
          </div>

          <!-- Other -->
          <div class="section-title">Other</div>
          <div class="detail-row">
              <label>Caffeine (mg)
                  <input type="number" bind:value={metrics.details.caffeine} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
              <label>Alcohol (g)
                  <input type="number" bind:value={metrics.details.alcohol} class="bg-input small" readonly={readOnly} placeholder="--" />
              </label>
          </div>

      </div>
  {/if}
</div>

<style>
  .nutrition-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
  }

  .macros-row {
      display: flex;
      gap: 10px;
  }
  
  .macro-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      flex-direction: column;
      gap: 6px;
  }
  
  .bg-input {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: white;
      padding: 12px;
      border-radius: var(--radius-m);
      font-size: 1rem;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
  }

  .bg-input:focus {
      border-color: var(--color-primary);
      background: rgba(255,255,255,0.1);
      outline: none;
  }
  
  .highlight-cal {
      color: var(--text-accent);
      font-weight: bold;
      border-color: var(--text-accent);
  }

  .details-toggle {
      background: none;
      border: none;
      color: var(--color-primary);
      font-size: 0.85rem;
      cursor: pointer;
      text-align: left;
      padding: 4px 0;
      opacity: 0.8;
  }

  .details-grid {
      background: rgba(0,0,0,0.2);
      border-radius: var(--radius-m);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border: 1px solid rgba(255,255,255,0.05);
  }

  .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-top: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 4px;
  }

  .detail-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 10px;
  }

  .small {
      padding: 8px;
      font-size: 0.9rem;
  }
</style>
