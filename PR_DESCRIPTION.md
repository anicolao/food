# Auth Persistence Improvements

## User Prompt
> There is a problem where auth really doesn't last at all for hte client. I'd like the user to stay logged in as long as possible to avoid ahving to re-authenticate all the time.

## Changes
- Implemented proactive token refresh in `src/lib/auth.ts`.
- Added `scheduleRefresh` to refresh token 5 minutes before expiry.
- Added `visibilitychange` listener to refresh token when tab becomes visible if near expiry.
- Improved `initializeAuth` to handle session restoration with accurate remaining time.
- Fixed TS errors in `src/routes/log/+page.svelte`.

## Artifacts
- [Implementation Plan](docs/auth_persistence/implementation_plan.md)
- [Walkthrough](docs/auth_persistence/walkthrough.md)
