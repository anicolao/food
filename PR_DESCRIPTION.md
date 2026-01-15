Fix Screen Transitions

## Verbatim User Prompt
The screen transitions turn out to be fakery - we are animating the same screen that is coming in going out - it should be the old screen exiting, and the new screen entering. Study the implementation and design adn figure out how to make it truly fly out hte old screen while bringing in teh new

## Relevant User Comments
- "nope, no change. still animating the new screen in and out."
- "Still no dice, new screens in both locations"
- "Yes! that is working."

## Summary of Changes
- Implemented a "Snapshot Strategy" to fix screen transitions.
- Created `src/lib/components/ui/PageTransitionWrapper.svelte` to wrap page content.
    - Checks a global store for a snapshot of the *exiting* page.
    - Renders static HTML snapshot if available (freezing the exiting view).
    - Renders live `children` snippet for the entering view.
- Updated `src/lib/transitions.ts` to include `transitionSnapshots` writable store.
- Updated `src/routes/+layout.svelte`:
    - Uses `beforeNavigate` to capture the `innerHTML` of the current view into the store.
    - Uses `afterNavigate` to clear the snapshot for the *new* (entering) route.
    - Replaces direct `{@render children()}` with `<PageTransitionWrapper>`.
- Added documentation in `docs/fix_screen_transitions/`.

## Verification
- `npm run check` passed.
- E2E tests (`002-log-food`) passed.
- Manual verification confirmed transitions are now correct (Old screen leaves, new screen enters).
