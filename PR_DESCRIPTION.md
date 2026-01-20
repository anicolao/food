Fix Flaky E2E Tests (Log Again & Favourites)

## Description
This PR hardens the `014-log-again.spec.ts` E2E test to resolve reported flakiness.

## Changes
- Added explicit `toBeVisible()` checks before clicking 'Log new food entry', 'Log Again', and 'Favourites'.
- This ensures the UI is hydration-stable and interactive before the test attempts to interact with it, preventing potential race conditions during heavy load or slower CI runs.

## Verification
- Ran `014-log-again.spec.ts` 20 times locally with 100% pass rate.
- Ran full E2E suite (`npm run test:e2e`) with 100% pass rate.
