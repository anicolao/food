# E2E Testing Guide

This project uses [Playwright](https://playwright.dev/) for End-to-End testing. Our E2E tests are the primary source of truth for application correctness.

## Philosophy

-   **Zero Tolerance**: Flaky tests are not acceptable. If a test flakes, it must be fixed immediately.
-   **Visual Regression**: We rely heavily on visual snapshots to catch UI regressions.
-   **Deterministic**: Tests must be deterministic. Use seeded random number generators if necessary.

## Writing Tests

1.  **Scope**: Each test file should cover a specific user story or feature.
2.  **Naming**: Use descriptive names for test files (e.g., `001-login-flow.spec.ts`).
3.  **Selectors**: Use resilient selectors. Prefer user-facing attributes (role, text) over CSS classes.
4.  **Waits**: Avoid arbitrary `waitForTimeout`. Use `waitForSelector`, `waitForURL`, or assertions that retry automatically.

## Running Tests

-   `npm run test:e2e`: Runs all E2E tests.
-   `npm run test:e2e -- --ui`: Opens the interactive Playwright UI.

## CI/CD

Tests are run automatically on every Pull Request. A PR cannot be merged unless all E2E tests pass.
