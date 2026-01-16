# Service Worker Implementation & Versioning

## User Prompts & Context

### Original Design Request
HOURS: 2026-01-16T11:28:37-05:00
> OK the offline work from teh recent design doc is completed. See OFFLINE_SUPPORT.md. But a major gap remains: though the database is now a write-through cache, the client itself is fetched over the network every time. 
> 
> Write a SERVICE_WORKER_DESIGN.md that will minimize all remaining network traffic. Include a mechanism to show the version of the code that is deployed inspired by this script from another project — don't implement it this way, but record the same style of version number. Ensure that the user can inspect this in the newly added network screen. Write the design doc only.
> 
> Sample version script:
> export function getVersion() {
>   const caution = version_info.status.length > 0 ? "⚠" : "";
>   const date = version_info.status.length > 0 ? \`\${version_info.date} \` : "";
>   return \`Neptune's Pride Agent v\${version_info.version} (\${date}\${caution}\${version_info.hash})\`;
> }`;
>   await $`echo export const version_info = ${JSON.stringify(version_info, null, 2)} > src/version.js`;
>   for (const line of getVersion.split("\n")) {
>     await $`echo ${line} >> src/version.js`;
>   }
>   await $`bunx biome format --write src/version.js`;
> }
> 
> I suggest we use VITE_ build variables and just refer to this script for the way the string should look, that's a better fit for how we are deploying this project

### Follow-up Clarification (Design)
HOURS: 2026-01-16T11:40:31-05:00
> This looks good except for some confusion about whether we want network first or cache first. We want cache first. Refresh the cache in the background. Make a new 'Update' icon to replace teh cloud is in sync icon, that lights up only after the cache is refreshed and the user can tap it to instantly switch. Add these clarifications to the design doc, and then follow WORKFLOW.md to make a PR for this design work.

### Implementation Instruction
HOURS: 2026-01-16T13:28:40-05:00
> Please read and follow WORKFLOW.md rigidly to create the PR yourself.

## Description
This PR implements the Service Worker design finalized in PR #43.

### Changes
1.  **Service Worker (`src/service-worker.ts`)**:
    *   Implemented Cache-First strategy for assets (`build` + `files`).
    *   Implemented Stale-While-Revalidate/Cache-First logic for navigation (HTML).
    *   Added update handling via `SKIP_WAITING`.

2.  **Versioning (`vite.config.ts`)**:
    *   Injected `VITE_APP_VERSION`, `VITE_APP_COMMIT_HASH`, `VITE_APP_BUILD_DATE`, `VITE_APP_DIRTY_FLAG`.

3.  **UI Updates (`src/routes/settings/network/+page.svelte`)**:
    *   Added "Application Info" section with version and storage usage.
    *   Added "Update Ready" badge to trigger SW updates.

## Verification
*   `npm run check` passes (Typescript).
*   `npm run build` passes.
*   E2E tests passed.
