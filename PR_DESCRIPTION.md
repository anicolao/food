# Fix: Namespace Sync Pointers

## Changes
- Namespace sync pointer keys by `spreadsheetId` and migrate legacy global keys on first use.
- Update Codex review notes for the resolved sync-pointer issue.
- Raise the log-page visibility checks to 2000ms to match the timeout cap.
- Navigate to the log page via the dashboard button to avoid slow full reloads in CI.

## Testing
- `.husky/pre-commit` (svelte-check warnings; Playwright: 13 passed, 1 skipped).

## Questions / Open Issues
- None.

## Original User Prompt(s)
> Ok I have rebased and merged the branch. go to main and pull and then resolve the next item from CODEX_REVIEW.md
>
> never bypass precommit. make a rule about that. Run the precommit checks now.
