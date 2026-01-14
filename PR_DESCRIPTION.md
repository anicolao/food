# Macro Settings Wiring and Animation Fix

## User Prompts
> OK we've just finished the macros settings UI and it looks good, but it is not properly wired into the system. Settings changes need to be written to the google sheet, and the main dashboard needs to read and respect them for showing the macro bubbles.
>
> Also there is a good animation fix for the donut chart htat keeps the shapes in their tracks, which needs to be replicated for the animations on the macro bubbles which deform quite a bit on the way to the desired state. 

> The macro bubbles don't draw peroperly any more and also don't animate when they transition. They shoudl animate to their new position. They should be able to draw all states well, low percentages, high percentages, and even > 100%.

> tweening looks great. But when teh bubble is very low (like 6%) it is clipped into a rectangel that makes the curve look wrong/bad.

## Changes
- **Persistence**: Wired `store.ts` to append `settings/goalsUpdated` events to the Google Sheet.
- **Dashboard**: Updated `routes/+page.svelte` to use real setting values from the store instead of mocks.
- **Animation**: 
  - Replaced CSS transition with `tweened` store in `MacroBubble.svelte` for smooth, deformation-free animation.
  - Implemented robust arc calculation for 0%, 100%, and >100% states.
  - Fixed clipping on small values by switching SVG filter to `userSpaceOnUse`.
- **Tests**: Updated `003-stats.spec.ts` to align with the default store settings (150g protein vs old 180g mock).

## Verification
See `docs/walkthroughs/macro-settings-fixing.md` for detailed verification steps and results.
