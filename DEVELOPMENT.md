# Development Standards

## Technology Stack

-   **Frontend**: SvelteKit (Svelte 5)
-   **State Management**: Redux (Event Sourcing Pattern)
-   **Testing**: Playwright
-   **Styling**: Vanilla CSS / Tailwind (if requested)
-   **Package Manager**: `npm`

## Architecture: Event Sourcing with Redux

We strictly adhere to an Event Sourcing pattern using Redux.

-   **Facts on the Ground**: The state is a result of a series of actions (events). We record *what happened* (e.g., `FOOD_LOGGED`), not just the resulting state.
-   **Reducers as Interpreters**: Reducers are pure functions that interpret these actions to produce the current application state.
-   **Debuggability**: Logic errors are fixed by rewriting reducers to correctly interpret the history of actions.

## Mobile Application

The iOS application is a thin native wrapper around the web application, using `WKWebView`. It serves primarily to provide a native app icon and potentially handle native-specific integrations in the future.

## Zero-Tolerance E2E Testing

We assume that if a feature is not tested, it is broken.

-   **Pixel-Perfect Consistency**: We use software rendering in E2E tests to ensure consistent snapshots across environments.
-   **GitHub Workflows**: Every PR is validated by the E2E suite.
-   **PR Previews**: Deployments are generated for every PR to allow manual verification.
-   **User Stories**: Every user story must be accompanied by at least one E2E test case.
