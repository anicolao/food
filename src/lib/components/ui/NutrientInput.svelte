<script lang="ts">
  interface Props {
      value: number | undefined;
      unit?: string;
      label?: string;
      placeholder?: string;
      step?: string | number;
      class?: string;
      readonly?: boolean;
      onupdate?: (val: number, oldVal?: number) => void;
      [key: string]: any;
  }

  let { 
      value = undefined, 
      unit = 'g', 
      label = '', 
      placeholder = '--', 
      step = 1,
      class: className = '',
      readonly = false,
      onupdate,
      ...rest
  }: Props = $props();

  let internalValue = $state(value);

  // Sync prop updates to internal state
  $effect(() => {
     internalValue = value;
  });

  function handleInput(e: Event) {
      const target = e.target as HTMLInputElement;
      const val = target.value === '' ? undefined : Number(target.value);
      const oldVal = internalValue;
      internalValue = val;
      if (onupdate && val !== undefined) onupdate(val, oldVal);
  }
</script>

<label class={`nutrient-input-wrapper ${className}`}>
  {#if label}
    <span class="input-label">{label}</span>
  {/if}
  <div class="input-container">
      <input 
        type="number" 
        value={internalValue} 
        class="gram-input" 
        {placeholder}
        {step} 
        {readonly}
        {...rest}
        oninput={handleInput}
      />
      {#if unit}
        <span class="suffix">{unit}</span>
      {/if}
  </div>
</label>

<style>
  .nutrient-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center; /* Center align for columns */
  }

  .input-label {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
  }

  .input-container {
      display: flex;
      align-items: baseline;
      gap: 2px;
      position: relative;
  }

  .gram-input {
      font-size: 0.9rem;
      color: white;
      background: rgba(255,255,255,0.1);
      padding: 4px 6px;
      border-radius: 6px;
      width: 6ch;
      text-align: center;
      border: 1px solid transparent;
      transition: all 0.2s;
  }
  
  .gram-input:focus {
      outline: none;
      background: rgba(255,255,255,0.2);
      border-color: rgba(255,255,255,0.3);
  }
  
  .gram-input:read-only {
      opacity: 0.7;
      background: rgba(255,255,255,0.05);
  }

  .suffix {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
  }

  /* Remove spinners */
  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
  }
</style>
