# Redirect Auth Flow Walkthrough

I have replaced the popup-based sign-in with a robust Redirect Flow to solve the authentication persistence issues on iPhone.

## Changes

### [auth.ts](file:///Users/anicolao/projects/antigravity/food/src/lib/auth.ts)
-   **Old Flow**: `signIn()` triggered `tokenClient.requestAccessToken()` which opened a popup.
-   **New Flow**: `signIn()` constructs a Google OAuth URL and redirects the entire page (`window.location.href`).
-   **Callback Handling**: Added `handleRedirectCallback()` to parse the `access_token` from the URL fragment (hash) upon return.
-   **Silent Refresh**: Preserved the existing `tokenClient` logic for background silent refreshes.
-   **Interactive Refresh**: Added `forceInteractive` flag to `ensureValidToken`. If `true` (triggered by user clicks), skips the blocked silent refresh loop and immediately triggers the Redirect Flow to restore the session.

### [src/routes/+layout.svelte](file:///Users/anicolao/projects/antigravity/food/src/routes/+layout.svelte)
-   **Global Listener**: Updated the global click listener to call `ensureValidToken(true)`.
-   **Effect**: On iOS/Safari, if the session is expired (silent refresh blocked by ITP), the **first user tap** will trigger a quick page reload (Redirect) to authorize, instead of failing silently or requiring manual sign-out.

### Tests
-   Updated `tests/e2e/001-auth/001-auth.spec.ts` and `tests/e2e/006-auth-persistence/006-auth-persistence.spec.ts` to support the new flow.
-   Added `interactive_recovery` test case to verify that clicking triggers the redirect mechanism when expired.

## Verification Results

### Automated Tests
-   `tests/e2e/001-auth/001-auth.spec.ts`: **PASSED**
-   `tests/e2e/006-auth-persistence/006-auth-persistence.spec.ts`: **PASSED**

## Next Steps for You
> [!IMPORTANT]
> **Configuration Required**
> Ensure you have added your application's URLs (e.g., `http://localhost:5173/`, `https://your-production-app.com/`) to the **Authorized redirect URIs** in your [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
