# Fix: Macro Bubble Glow Clipping

## User Prompt (Verbatim)
> THe macro bubble rings are clipped by their bounding boxes as shown in the screenshot - the glow is cut off on all four sides. Fix it and regenerate e2e screenshots as necessary.

## Changes
- **CSS/SVG Adjustment**: Expanded the `filter` region in `MacroBubble.svelte` to prevent clipping of the glow effect.
    - Updated `filterUnits` attributes `x`, `y`, `width`, `height` to calculated values based on `size` (e.g., `width={size*2}`).
- **E2E Updates**: Regenerated E2E snapshots to reflect the visual changes (unclipped glow).

## Verification
- See [Walkthrough](./docs/walkthrough_macro_bubble_clipping.md) for details.
- **E2E Tests**: Ran `tests/e2e/005-dashboard-state.spec.ts`, `tests/e2e/003-stats/003-stats.spec.ts`, and `tests/e2e/002-log-food/002-log-food.spec.ts` with `--update-snapshots`.

