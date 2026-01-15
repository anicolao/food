Cleanup Plan Proposal

## Verbatim User Prompt
Fix item #1 on the cleanup plan. While you are at it, investigate ways to fix up auth generally so that auth persists — it is very hard to stay logged into the app at the moment and I would like authentication to persist as long as possible.

## Relevant User Comments
- "Can we make local token expiry *much longer* than 1h? I suggest 48h. Also, if silent refresh fails, let's redirect the user to the signin screen."
- "no, do a git reset HEAD^ and follow WORKFLOW.md to do it"

## Summary of Changes
- Created `CLEANUP_PLAN.md` based on the analysis of `STATE_OF_THE_UNION.md` (previous context).
- **Implemented Fix for Cleanup Item #1 (Auth Token Revocation):**
  - Updated `signOut` in `src/lib/auth.ts` to capture the token before nulling it, ensuring `google.accounts.oauth2.revoke` is called with the valid token.
- **Improved Auth Persistence (On-Demand Strategy):**
  - Refactored `src/lib/auth.ts` to export `ensureValidToken()`, which checks expiry and awaits a silent refresh if needed *before* returning.
  - Updated all API consumers (`gemini.ts`, `sheets.ts`, `google-photos.ts`, `images.ts`) to use `await ensureValidToken()` instead of `getAccessToken()`.
  - This guarantees that even if the app was backgrounded for hours, the next API call will seamlessly refresh the token before execution.
  - Implemented 48h "recovery window" logic: if token is expired but <48h old, it silent refreshes. If >48h, it forces sign-in.

## Verification
- **Auth Fixes:**
  - Ran `npm run check` (passed).
  - Verified logic for 48h window and silent refresh triggers.
