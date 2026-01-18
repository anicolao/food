# Fix Flaky E2E Tests

## User Prompt
The e2e tests are a little flaky on the cloud sync icon still. There was a recent commit meant to address this, but I've seen it again in production on 013-detailed-nutrition/013-detailed-nutrition.spec.ts:5 where the cloud icon showed syncing instead of sync. 

I also saw an oddball flake on 002-log-food/002-log-food.spec.ts:7 where the + icon was missing from the nutrition facts detail on a food log. 

Let's add checks to these tests to ensure cloud sync state is right and the icon is loaded before taking the corresponding screenshots.

## Changes
- **013-detailed-nutrition.spec.ts**: Added explicit wait for `[data-status="synced"]` after saving entry to prevent race condition with screenshots.
- **002-log-food.spec.ts**: Added explicit wait for `.icon-toggle` visibility after analysis to ensure nutrition form is fully loaded.

## Verification
Ran local tests:
- `tests/e2e/013-detailed-nutrition/013-detailed-nutrition.spec.ts`: Passed
- `tests/e2e/002-log-food/002-log-food.spec.ts`: Passed
