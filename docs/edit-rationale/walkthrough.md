# Walkthrough - Edit Rationale E2E Test

## Changes

### New E2E Test
Created `tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts` which mirrors the unit test scenario from `tests/unit/store.test.ts`.

#### Features Tested
- **Data Seeding**: Verified that the test can seed precise event history into the app via network interception, replicating the unit test state.
- **Optimistic UI Updates**: Verified that editing a `rationale` field immediately updates the local state and UI even if the backend sync encounters constraints (mocked 401/empty for robustness).
- **Textarea Binding**: Confirmed that the `Rationale / Notes` textarea correctly binds to the data model and reflects changes.

## Verification Results

### Automated Test
Run command: `npx playwright test tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts`

**Result**: PASS

The test confirms:
1.  App loads with seeded "Lunch" entry.
2.  User can navigate to the edit screen.
3.  Old rationale is present.
4.  User can edit the rationale.
5.  After saving, the new rationale is persisted in the UI.
