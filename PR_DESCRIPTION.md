# Sync Manager UX Improvements

## User Prompts & Context

### Original Request
> Sync UX Verification
> The user's main objective is to verify the implemented Sync UX improvements by simulating a sync error and observing the UI's response. This includes:
> 1. Injecting a simulated sync failure into sync-manager.ts.
> 2. Verifying the red error icon appears in the NetworkStatus component.
> 3. Confirming navigation to the /settings/network page upon clicking the error icon.
> 4. Checking for the presence of the "Problem Detected" section, the error message, and the pulsing red "Reset Cache & Resync" button on the settings page.
> 5. Reverting the simulated error and confirming the UI returns to its normal state.

## Description
This PR implements comprehensive error handling and UI feedback for the synchronization process. Previously, sync errors were silent or transient. Now, they persist and guide the user to a resolution.

### Changes
1.  **Lib Layer (`src/lib/sync-manager.ts`)**:
    *   Added `syncError` store to track the last error message.
    *   Updated `sync()` to catch exceptions (including 400/403) and populate `syncError`.
    *   Ensured `hardResync()` clears the error state.

2.  **UI Components (`src/lib/components/ui/NetworkStatus.svelte`)**:
    *   Added subscription to `syncManager.syncError`.
    *   Displays a **Red Error Icon** when an error is active, overriding other states.

3.  **Pages (`src/routes/settings/network/+page.svelte`)**:
    *   Added a "Problem Detected" section.
    *   Displays the specific error message and troubleshooting advice.
    *   Highlights the "Reset Cache & Resync" button with a `danger-glow` animation.

## Verification
*   **Automated E2E**: Created `tests/e2e/099-sync-error.spec.ts` (temp) to simulate a 400 error and verify:
    *   Red icon visibility.
    *   Navigation to settings.
    *   Error panel content.
*   **Manual**: Verified locally via fault injection.

## Artifacts
*   [Implementation Plan](docs/implementation_plan_sync_ux.md)
*   [Walkthrough](docs/walkthrough_sync_ux.md)
