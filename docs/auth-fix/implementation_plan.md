# Interactive Auth Refresh Implementation Plan

## Goal Description
Fix the "seamless session extension" failure on iPhone/Safari (ITP blocking silent iframes) by making `ensureValidToken` aware of interactive contexts. When a user interacts with the app (e.g., clicks) and the token is expired, the system will immediately trigger an interactive Redirect flow instead of attempting (and failing) a silent refresh.

## User Review Required
> [!NOTE]
> **User Experience Change**
> On iOS (or browsers blocking third-party cookies), if the session is expired (>1 hour), the **first click** on the app will trigger a **full page reload/redirect** to refresh the token. This is necessary to restore the session without blocking popups or requiring manual sign-out.

## Proposed Changes

### Auth Library (`src/lib/auth.ts`)
#### [MODIFY] [auth.ts](file:///Users/anicolao/projects/antigravity/food/src/lib/auth.ts)
-   **Update** `ensureValidToken(forceInteractive: boolean = false)`:
    -   Accept `forceInteractive` flag.
    -   If token is expired/buffering AND `forceInteractive` is true:
        -   Skip `refreshAuth()` (silent).
        -   Call `signInWithRedirect()` immediately.
-   **Update** `refreshAuth()`:
    -   (Optional) If we want `refreshAuth` to also handle the fallback logic, but `ensureValidToken` is the cleaner entry point for this decision.

### Layout (`src/routes/+layout.svelte`)
#### [MODIFY] [+layout.svelte](file:///Users/anicolao/projects/antigravity/food/src/routes/+layout.svelte)
-   **Update Global Click Listener**:
    -   Call `ensureValidToken({ forceInteractive: true })` (or pass `true`).
    -   This guarantees that any user tap will trigger the interactive repair path if needed.

## Verification Plan

### Manual Verification
1.  **Simulate Expiry**:
    -   Manually set `food_log_token_expiry` in localStorage to a past timestamp (e.g., `Date.now() - 1000`).
2.  **Trigger Interactive Refresh**:
    -   Click anywhere on the page.
    -   **Verify**: The page immediately redirects to `accounts.google.com` and then back to the app.
    -   **Verify**: The new token is valid and session is active.
3.  **Verify Non-Interactive**:
    -   Wait for the background timer (if active). It should still *try* silent refresh (which may fail on iOS, but won't redirect randomly).

### Automated Tests
-   **Update** `tests/e2e/006-auth-persistence.spec.ts`:
    -   Add a test case where `ensureValidToken({ forceInteractive: true })` is called when token is expired.
    -   Verify it triggers the redirect flow (intercept request).
