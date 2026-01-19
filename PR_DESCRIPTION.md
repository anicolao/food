# Feature: Log Again and Favourites

## Changes
- **Store**: Added `favourites` slice and `log/logAgain` redo logic.
- **UI**: 
    - Added "Log Again" button to `InputGrid` (context-aware).
    - Added "Favourites" button and `FavouritesPicker` component.
    - Updated mobile FAB to carry context.
- **Testing**: Added `tests/e2e/014-log-again/014-log-again.spec.ts`.

## Verification
- Run `npx playwright test tests/e2e/014-log-again/014-log-again.spec.ts`
- E2E tests passed locally.

## Original User Prompt
> The user's primary goal is to resolve the persistent E2E test failures in the "Log Again" and "Favourites" feature implementation. This involves debugging the test execution, identifying the root cause of the assertion failures, and making necessary code adjustments in both the test file and potentially the application code to ensure the tests pass consistently.
