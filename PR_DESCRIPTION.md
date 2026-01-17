# Add E2E Test for Edit Rationale (Mirroring Unit Test)

## Context
This PR adds a new E2E test `tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts` that strictly mirrors the scenario in `tests/unit/store.test.ts`. This ensures that the frontend correctly handles and displays updates to an entry's rationale, verifying the detailed edit flow.

## Changes
- Created `tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts`
- Added mock logic to intercept Drive/Sheets requests and seed specific event data matching the unit test.
- Verified that editing the rationale in the UI correctly persists and updates the view.

## Verification
- Run `npx playwright test tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts` -> PASS

## User Prompt
examine the unit test in tests/unit/store.test.ts. read the e2e guide. Make an e2e test that corresponds exactly to the unit test. Verify that when you open the listing whose text is edited that the edited text appears in the UI. follow WORKFLOW.md to put that up as a new PR
