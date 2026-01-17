# Implementation Plan - Mirror Store Unit Test in E2E

## Goal
Create an E2E test (`tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts`) that strictly mirrors the scenario in `tests/unit/store.test.ts`. The test will verify that editing a log entry's description/rationale correctly updates the UI.

## Proposed Changes

### [New Test Scenario]
#### [NEW] [012-edit-rationale.spec.ts](file:///Users/anicolao/projects/antigravity/food/tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts)
- **Mocking**:
    - Mock Drive, Photos, and Sheets APIs using existing helpers (`mockDriveAPI`).
    - **Data Seeding**:  Intercept `GET .../values/Events` to return the exact sequence of 5 events from `store.test.ts` (up to the point before the edit).
        - Format: `[eventId, timestamp, type, JSON.stringify(payload)]`.
    - **Time Mocking**: Set the browser clock to match the "today" of the unit test data (`2026-01-15T12:00:00`).
- **Test Steps**:
    1.  **Initial Load**: Verify the dashboard shows the seeded "Lunch" entry ("Ham and creamy sauce...").
    2.  **Navigate to Edit**: Click on the entry to expand/edit.
    3.  **Perform Edit**: Change the `Rationale` field.
    4.  **Save**: persist the change.
    5.  **Verification**: Verify the UI displays the updated text ("...and 1 tablespoon of Bitch'n sauce").

## Verification Plan

### Automated Tests
- Run the new test:
  ```bash
  npx playwright test tests/e2e/012-edit-rationale/012-edit-rationale.spec.ts
  ```
