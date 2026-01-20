# Fix: Wait for Synced Status Before Screenshots

## Changes
- Require a stable `data-status` value (default `synced`) before Playwright screenshots.
- Allow tests to override expected network status (used for sync-error screenshots).
- Wait for the nutrition details toggle icon to finish loading before taking screenshots.
- Wait for the log page header/buttons to render before screenshot steps to avoid timing flake.
- Refresh the detailed nutrition edit snapshot after syncing completes.
- Set E2E timeout guidance to 2000ms max and forbid arbitrary waits.

## Testing
- `.husky/pre-commit` (svelte-check warnings; Playwright: 13 passed, 1 skipped).

## Questions / Open Issues
- None.

## Original User Prompt(s)
> The e2e tests failed in CI. Use gh to download the logs and artifacts and resolve the failure.
>
> for installing tools, you can use nix (edit flake.nix) and run them with nix develop -c
> it isn't an error state in CI, CI isn't waiting for sync to complete before taking the screenshot and that is the problem/the correct fix
>
> Ok I have rebased and merged the branch. go to main and pull and then resolve the next item from CODEX_REVIEW.md
>
> On your new branch with the e2e fix, CI is failing. Look at the run to determine waht the problem is and fix the PR.
>
> You seem to not be able to look at the screenshot. In this case, teh problem is a missing + icon from the nutrient details form. The expected screenshot is correct. The acutal screenshot has been taken befor ethe + icon has loaded and is missing the icon. It's a new problem, unrelated to the fix on this branch, but nonetheless needs fixing.
>
> all PRs should be based off of origin main and updated on github, so please fix it for easy review.
