# Implementation Plan - Fix Missing Edit Bug

The user reports that edits to an item are not persisted when re-opening the item, despite a successful unit test. This suggests a regression in the E2E flow, possibly related to component state initialization or store reactivity.

## User Review Required

> [!IMPORTANT]
> I will creating a new E2E test `tests/e2e/011-edit-bug-repro.spec.ts` to strictly reproduce this scenario (Create -> Edit -> Save -> Verify List -> **Re-open Details** -> Verify Edit).

## Proposed Changes

### Tests
#### [NEW] [tests/e2e/011-edit-repro.spec.ts](file:///Users/anicolao/projects/antigravity/food/tests/e2e/011-edit-repro.spec.ts)
- Create a new test based on `005-details-edit-delete.spec.ts`.
- Focus on the "Edit" flow.
- Add a critical verification step:
    1. Log food.
    2. Edit food (Change name to "Updated Food").
    3. Save.
    4. Click "Updated Food" in list.
    5. **Assert** that the "Item Name" input field contains "Updated Food".

### Application Code
#### [MODIFY] [src/routes/entry/+page.svelte](file:///Users/anicolao/projects/antigravity/food/src/routes/entry/+page.svelte)
- **Refactor to Svelte 5 Runes**: Replace `let form` with `let form = $state(...)` to ensure robust reactivity.
- **Remove Manual Sync**: The component currently manually calls `appendRow` AND dispatches to store (which triggers middleware sync). This causes duplicate events and race conditions. Removed the manual `appendRow` and rely entirely on the Redux middleware.
- **Improved ID Handling**: Use `$derived` for `id` to ensure proper reactivity if the component is reused.

## Verification Plan

### Automated Tests
- Run the reproduction test `tests/e2e/011-edit-repro.spec.ts` (which now includes persistence check).
- **Update**: Test failing on List View update. Debugging reactivity race between store update and Home page mount. Added logs to diagnose.
- Run `tests/e2e/005-details-edit-delete` to ensure no regression.

