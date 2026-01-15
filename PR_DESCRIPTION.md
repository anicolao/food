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
- **Improved Auth Persistence:**
  - Implemented logic in `initializeAuth` to attempt a silent refresh if the local token is expired but within a **48-hour recovery window**.
  - Added a strict redirect to `/` (Sign In) if silent refresh fails, ensuring users don't get stuck in an unauthenticated state.

## Verification
- **Auth Fixes:**
  - Ran `npm run check` (passed).
  - Verified logic for 48h window and silent refresh triggers.
