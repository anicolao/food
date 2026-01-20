# Codex Review

## Findings

### High
- `src/routes/log/+page.svelte:587-660`: `handleSubmit` races uploads with a 3s timeout and proceeds when the timeout wins, but the entry is saved with an empty `imageDriveUrl` even if uploads complete later. Since `media/uploadCompleted` does not update the entry, those images never appear in the dashboard/detail views. Consider persisting pending media IDs and updating the entry (or projection) when uploads finish, or block save until at least one URL is resolved.

### Medium
- `src/lib/store.ts:208-246`: `applyEventToState` generates `FavouriteItem.id` with `crypto.randomUUID()` inside the reducer. This makes event replays nondeterministic across devices and can diverge favorites between clients in an event-sourced system. Prefer emitting the ID in the event payload or deriving it deterministically from the source entry.
- `src/lib/sync-manager.ts:57-127`: Sync pointers (`lastSyncedRow`, `lastSyncedEventId`) are stored globally in `localStorage` without namespacing by `spreadsheetId` or user. Switching accounts/spreadsheets can reuse stale pointers and skip or duplicate events until a reset. Store pointers per spreadsheet/user or reset them when config changes.

### Low
- `src/lib/components/ui/NutrientInput.svelte:37-43`: Clearing an input sets `val` to `undefined`, but `onupdate` is skipped when `val` is `undefined`. This makes it impossible to clear a numeric field without it reverting to its previous value. Consider firing updates for empty values and letting the parent decide how to handle `undefined`/`null`.
- `src/lib/images.ts:3-30`: `resolveDriveImage` caches `URL.createObjectURL` results indefinitely without revocation. Over long sessions this can leak memory. Consider evicting old entries and calling `URL.revokeObjectURL` when images are no longer needed.

## Questions / Assumptions
- Is it acceptable for entries saved during slow uploads to omit `imageDriveUrl`, or should those entries be backfilled once uploads finish?
- Do you expect users to sign into multiple Google accounts on the same device/browser? If yes, local sync pointers need to be scoped per account/spreadsheet.

## Notes
- No automated tests were run for this review.
