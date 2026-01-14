# User Experience: Screen Transitions

## Goal
Replace the instantaneous "pop" of screen changes with smooth, physical sliding transitions that convey spatial relationships between screens. The interface should feel like a cohesive physical space where users slide deeper into details and slide back out to the high-level view.

## Navigation Topology

We define a hybrid **Spatial + Contextual** system.

### 1. Horizontal Axis (Main <-> Settings)
*   **Visual Logic**: Home is **Left**, Settings is **Right**.
*   **Routes**: `/` (Left) <---> `/settings` (Right).
*   **Transition**:
    *   **To Settings**: Home slides out **Left**, Settings slides in from **Right**.
    *   **Back to Home**: Settings slides out **Right**, Home slides in from **Left**.

### 2. Vertical Axis (The "Log" Modal)
*   **Visual Logic**: The Log screen lives "below" the viewport, acting like a full-screen sheet.
*   **Routes**: To/From `/log`.
*   **Transition**:
    *   **Open Log**: Log slides **UP** from bottom. The underlying screen (Home or Settings) is pushed **UP** off the top.
    *   **Close Log**: Log slides **DOWN** off the bottom. The destination screen slides **DOWN** from the top.

### 3. Drill Down (Contextual Items)
*   **Visual Logic**: Detail view is "inside" or "to the right" of the parent list item.
*   **Routes**: `/` -> `/entry/[id]`.
*   **Transition**:
    *   **View Entry**: Feed slides out **Left**. Entry slides in from **Right**. (Standard Drill-Down).
    *   **Back to Feed**: Entry slides out **Right**. Feed slides in from **Left**.

## Implementation Specification

### 1. Direction Calculation
We need a robust resolver to determine the animation params based on `from` and `to` paths. We will create a `getTransitionParams(from, to)` helper.

```typescript
type Direction = 'left' | 'right' | 'up' | 'down';

// Heuristic Mapper
function getTransition(from: string, to: string) {
    // 1. Vertical overrides (Logging)
    // Going TO Log -> Always Slide UP (Enter Bottom)
    if (to.includes('/log')) return { enter: 'bottom', exit: 'top' }; 
    // Leaving Log -> Always Slide DOWN (Enter Top)
    if (from.includes('/log')) return { enter: 'top', exit: 'bottom' };

    // 2. Horizontal Axis (Main <-> Settings)
    if (from === '/' && to === '/settings') return { enter: 'right', exit: 'left' };
    if (from === '/settings' && to === '/') return { enter: 'left', exit: 'right' };

    // 3. Drill Down (Feed <-> Entry)
    if (from === '/' && to.includes('/entry')) return { enter: 'right', exit: 'left' };
    if (from.includes('/entry') && to === '/') return { enter: 'left', exit: 'right' };

    // Default: Fade or None
    return null; 
}
```

### 2. Layout Transitions
We will use Svelte's `fly` transition with dynamic parameters in `src/routes/+layout.svelte`.

*   **View Management**: The pages will need to be absolutely positioned or grid-stacked to allow overlap during the transition.
*   **Params**:
    *   `enter: 'bottom'` -> `in: fly={{ y: 100% }}`, `out: fly={{ y: -100% }}` (Push Up)
    *   `enter: 'top'` -> `in: fly={{ y: -100% }}`, `out: fly={{ y: 100% }}` (Push Down)
    *   `enter: 'right'` -> `in: fly={{ x: 100% }}`, `out: fly={{ x: -100% }}` (Slide Left)
    *   `enter: 'left'` -> `in: fly={{ x: -100% }}`, `out: fly={{ x: 100% }}` (Slide Right)

### 3. Edge Cases
*   **Browser Back Button**: The `from` and `to` logic must be robust enough to handle history navigation. The defined rules above are stateless (based only on path), so hitting "Back" from `/log` correctly maps to `from: /log, to: /` which triggers the "Slide Down" animation.
*   **Scroll Restoration**: SvelteKit handles this, but we must ensure the outgoing page doesn't flick to top before sliding out.

## Verification
*   **Manual**: Open Settings -> Slide Left. Click Back -> Slide Right.
*   **Manual**: Open Log -> Slide Up (Push Top). close Log -> Slide Down (Push Bottom).
*   **Manual**: Tap Entry -> Slide Left. Back -> Slide Right.
