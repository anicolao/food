Cleanup Plan Proposal

## Verbatim User Prompt
Review STATE_OF_THE_UNION*.md (two files) and make a CLEANUP_PLAN.md that identifies any items worth addressing in priority order. Some of the criticisms there aren't critical and can be ignored for now, but you can probalby find 2-5 higher priority items for the cleanup plan.

## Relevant User Comments
- "Follow WORKFLOW.md rigidly and put up a PR with the plan."

## Summary of Changes
- Created `CLEANUP_PLAN.md` based on the analysis of `STATE_OF_THE_UNION.md` and `STATE_OF_THE_UNION_AG.md`.
- Identified 5 high-priority items:
    1. Fix Authentication Token Revocation (Bug)
    2. Implement Redux Event Store Idempotency (Data Safety)
    3. Add Error Notifications for Sync Failures (UX/Reliability)
    4. Remove Production Debug Logging (Code Hygiene)
    5. Harden Type Definitions (Maintainability)

## Verification
- N/A (Documentation/Planning artifact only)
