# Inspiration

This project's architecture and best practices are heavily inspired by the following repositories:

## `outpost7` (@anicolao)
-   **Redux & Event Sourcing**: Demonstrates the pattern of using Reducers as interpreters of a history of actions ("facts on the ground").
-   **Playwright Configuration**: Provides the baseline for a strict, pixel-perfect E2E testing setup (software rendering, zero tolerance).
-   **Project Structure**: SvelteKit application structure.

## `iostt` (@anicolao)
-   **Native Wrapping**: Serves as the reference for wrapping the web application in a thin iOS native layer using `WKWebView`.

## General Philosophy
-   **Agentic Design**: Building with the assumption that AI agents will be reading and modifying the code, necessitating clear documentation and strong typing.
