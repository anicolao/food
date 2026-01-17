# Task List

- [x] usage of `task_boundary`
- [x] Research
    - [x] Locate and analyze the existing unit test in `tests/unit/store`
    - [x] Understand the "E2E guide" (check `tests/e2e/README.md` or inferred patterns)
    - [x] Analyze the store implementation and how edits are persisted
- [x] Implementation Plan
    - [x] Create `implementation_plan.md`
- [/] Execution
    - [x] Create a reproduction E2E test
    - [x] Verify the test fails (reproduce the bug)
    - [/] Fix the bug in the application code
        - [x] Refactor Entry page to Svelte 5 & Single Source of Truth
        - [x] Fix Race Condition: Make Entry Page reactive to store hydration
        - [x] Fix Root Cause: Fix IDB Hydration (fallback for broken index)
    - [x] Verify the test passes
- [x] Verification
    - [x] Run all E2E tests to ensure no regressions
