# User Experience: Screen Transitions

## Goal
Replace the instantaneous "pop" of screen changes with smooth, physical sliding transitions that convey spatial relationships between screens. The interface should feel like a cohesive physical space where users slide deeper into details and slide back out to the high-level view.

## Navigation Topology

We define a "Depth" hierarchy to determine transition direction.

| Route | Depth | Interaction Type |
|-------|-------|------------------|
| `/` (Feed) | 0 | Root View |
| `/entry` | 1 | Detail View (Drill Down) |
| `/log` | 1 | Action View (Modal-like) |
| `/settings` | 1 | Context View (Side/Overlay) |

### Flows & Transitions

The transition direction logic is based on the delta between **New Depth** and **Old Depth**.

1.  **Drill Down (0 -> 1)**:
    *   *Context*: User taps a feed item, logs food, or opens settings.
    *   *Animation*: **Slide Left**.
    *   *Details*: The Current Screen (Feed) slides out to the **Left**. The New Screen enters from the **Right**.

2.  **Return / Back (1 -> 0)**:
    *   *Context*: User saves an entry, closes logging, or navigates back.
    *   *Animation*: **Slide Right**.
    *   *Details*: The Current Screen (Detail) slides out to the **Right**. The New Screen (Feed) enters from the **Left**.

3.  **Lateral (1 -> 1)** (Rare):
    *   *Context*: Switching between Log and Settings directly (if possible).
    *   *Animation*: **Crossfade** or **No Transition** (maintain Context).
    *   *Default*: Treat as discrete jumps or go via Root.

## Implementation Specification

### 1. Viewport Management
To allow two screens to exist simultaneously during the transition (sliding over each other), the main content container must utilize a CSS Grid or Absolute Positioning strategy.

*   **Container**: `grid-area: 1 / 1 / 2 / 2;`
*   **Pages**: child elements must occupy the same grid cell so they overlay perfectly during the animation flux.

### 2. Svelte 5 Transition Logic
We will implement this in `src/routes/+layout.svelte`.

*   **Key**: Use a unique identifier for the transition key, typically `$page.url.pathname`.
*   **State**: Track `currentDepth` and `prevDepth` to calculate `direction`.
*   **Transition**: Use `fly` from `svelte/transition`.

#### Algorithm
```typescript
// Pseudo-code for Layout.svelte
let depth = $derived(getDepth(page.url.pathname));
let direction = $state(0);

$effect.pre(() => {
    // Determine direction before update
    if (newDepth > oldDepth) direction = 1; // Slide Left (Enter Right)
    else if (newDepth < oldDepth) direction = -1; // Slide Right (Enter Left)
    else direction = 0;
});

// Transition Params
const transitionIn = { x: direction * 100%, duration: 300, easing: cubicOut };
const transitionOut = { x: -direction * 100%, duration: 300, easing: cubicOut };
```

### 3. Edge Cases
*   **Initial Load**: No transition (direction 0).
*   **Browser Back Button**: Must correctly infer direction (History API integration or just rely on Depth map). *Note: Depth map is robust for Back button usage as it relies on target URL, not history stack delta.*
*   **Scroll Position**: SvelteKit handles scroll restoration. We must ensure the `fly` transition doesn't cause scroll jumping (overflow hidden on container during transit).

## Technical Requirements
*   **Modify**: `src/routes/+layout.svelte`
*   **New Util**: `src/lib/route-depth.ts` (Map paths to depth integers).
*   **Style**: Ensure `.app-shell` or `main` has `overflow-x: hidden` to prevent horizontal scrollbars during the slide.

## Verification
*   **Manual**: Navigate Feed -> Entry -> Back. Observe Slide Left then Slide Right.
*   **Manual**: Navigate Feed -> Log -> Save. Observe Slide Left then Slide Right.
*   **Manual**: Browser Back button behaves consistently with UI Back button.
