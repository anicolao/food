# Service Worker Design and Offline Optimization

## User Prompts & Context

### Original Request
> But a major gap remains: though the database is now a write-through cache, the client itself is fetched over the network every time.
>
> Write a SERVICE_WORKER_DESIGN.md that will minimize all remaining network traffic. Include a mechanism to show the version of the code that is deployed inspired by this script from another project...
>
> I suggest we use VITE_ build variables and just refer to this script for the way the string should look...

### Follow-up Clarification
> This looks good except for some confusion about whether we want network first or cache first. We want cache first. Refresh the cache in the background. Make a new 'Update' icon to replace teh cloud is in sync icon, that lights up only after the cache is refreshed and the user can tap it to instantly switch.

## Description
This PR introduces the `SERVICE_WORKER_DESIGN.md` document, which outlines the strategy for:
1.  **Offline-First Caching**: Implementing a Service Worker to cache the app shell and assets, serving them immediately from cache to minimize network traffic.
2.  **Background Updates**: A "Stale-While-Revalidate" approach where the SW checks for updates in the background.
3.  **Update Visibility**: A new UI pattern ("Update Icon") that notifies the user when a new version is downloaded and ready to swap.
4.  **Versioning**: Injecting git commit hash and build timestamp via Vite environment variables for better debugging.

## Artifacts
*   `SERVICE_WORKER_DESIGN.md`
