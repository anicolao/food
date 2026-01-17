# Fix Missing Edit Persistence Bug

## Summary of Changes
- **Refactored `src/routes/entry/+page.svelte`**: Migrated to Svelte 5 Runes (`$state`, `$derived`, `$effect`) and removed manual `appendRow` calls to rely on Redux middleware as the Single Source of Truth.
- **Fixed IDB Hydration**: Updated `src/lib/db.ts` to include a fallback mechanism. If the `by-timestamp` index returns 0 results (due to potential corruption or browser quirks), it now falls back to `getAll()` and sorts in memory.
- **Fixed Race Condition**: Added reactive store subscription to `entry/+page.svelte` to ensure the form is populated correctly even if the component mounts before async hydration completes.
- **Added Reproduction Test**: Created `tests/e2e/011-edit-repro.spec.ts` which successfully reproduced the bug (failing on reload) and now passes.

## User Prompt
Fix Missing Edit Bug
The user's main objective is to fix a "missing edit" bug where changes to a food log item are not persisted upon re-opening. This involves:
1. Ensuring the E2E test (`011-edit-repro.spec.ts`) accurately reproduces the bug by failing after an edit and page reload.
2. Refactoring `src/routes/entry/+page.svelte` to use Svelte 5 Runes and eliminate duplicate synchronization logic, which is suspected to be masking the bug or causing inconsistent state.
3. Once the bug is consistently reproduced by the E2E test, identifying and implementing the necessary fix in the application code.
4. Ensuring the E2E test passes after the fix.
5. Running existing E2E tests to confirm no regressions.
