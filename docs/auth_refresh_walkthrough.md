# Auth Refresh on Click Walkthrough

## Changes
- **Modified `src/routes/+layout.svelte`**:
    - Added global `document.addEventListener('click', ...)` in `onMount`.
    - Handler calls `ensureValidToken()` from `$lib/auth`.
    - Added cleanup logic in `$effect` return.

## Verification
### Manual Verification Steps
1.  **Wait for Expiry**: Allow token to expire (or artificially set expiry in localStorage to past).
2.  **Click anywhere**: Click on the "Log Food" button or any neutral area.
3.  **Observe Console**: Check DevTools console for `[Auth] Token expired/buffered... Refreshing...` followed by successful token acquisition.
4.  **No Sign-out**: Ensure the user is NOT signed out and can proceed with logging immediately.

## Automated Tests
- **E2E Test**: `tests/e2e/095-auth-refresh-robustness.spec.ts` verifies:
    - Token refresh timeout (10s) and explicit logout on expiry.
    - Token retention if refresh hangs but token is still valid (in buffer).
    - Preemptive auth check triggered by click interaction.

