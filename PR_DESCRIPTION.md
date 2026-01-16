# Service Worker Design and Offline Optimization

## User Prompts & Context

### Original Request
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

### Follow-up Clarification
HOURS: 2026-01-16T11:40:31-05:00
> This looks good except for some confusion about whether we want network first or cache first. We want cache first. Refresh the cache in the background. Make a new 'Update' icon to replace teh cloud is in sync icon, that lights up only after the cache is refreshed and the user can tap it to instantly switch. Add these clarifications to the design doc, and then follow WORKFLOW.md to make a PR for this design work.

## Description
This PR introduces the `SERVICE_WORKER_DESIGN.md` document, which outlines the strategy for:
1.  **Offline-First Caching**: Implementing a Service Worker to cache the application shell and assets, serving them immediately from cache to minimize network traffic.
2.  **Background Updates**: A "Stale-While-Revalidate" approach where the SW checks for updates in the background.
3.  **Update Visibility**: A new UI pattern ("Update Icon") that notifies the user when a new version is downloaded and ready to swap.
4.  **Versioning**: Injecting git commit hash and build timestamp via Vite environment variables for better debugging.

## Artifacts
*   `SERVICE_WORKER_DESIGN.md`
