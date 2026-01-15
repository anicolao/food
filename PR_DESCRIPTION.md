feat: Dashboard UI Cleanup and State Management

## Changes
- Removed redundant "Log New" link from dashboard.
- Implemented URL-based date state preservation (`?date=YYYY-MM-DD`).
- Implemented URL-based card expansion state (`?collapsed=...`).
- Added directional slide transitions for date navigation.
- Added comprehensive E2E tests for dashboard state sequences.

## User Prompt
Debug Dashboard State E2E
The user's main objective is to verify the dashboard UI improvements and state management features through E2E tests, and resolve any issues that arise during this verification process. This involves:
1.  Fixing the missing script tag in `ActivityCard.svelte`.
2.  Removing duplicated `dateTitle` code in `src/routes/+page.svelte`.
3.  Ensuring E2E tests in `tests/e2e/005-dashboard-state.spec.ts` pass reliably, covering:
    *   Absence of the "Log New" link.
    *   Correct URL updates for date navigation.
    *   Persistence of the correct date on page reload.
    *   Proper functioning of the browser's "Back" button for date navigation.
    *   Persistence of `ActivityCard` expanded/collapsed states (to be fully implemented in the test).
4.  Debugging and correcting Playwright test setup, specifically resolving issues with date mocking that interfere with SvelteKit's navigation, to accurately test the implemented features.
