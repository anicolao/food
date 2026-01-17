# Fix: Timestamp Anomaly and Double-Write Bug

## User Prompt (Verbatim)
> The user observed a situation where committing an entry made with the text tool resulted in three rows being added to the sheet, each with a different GUID... This suggested a retry logic or multiple dispatches.
>
> The user observed another peculiar situation where a `log/entryConfirmed` event had an `EventID` (`ec693587-27f8-4172-8958-a7c0ff00b101`) that *matched* the `EntryID` within its payload, and the event's timestamp (`2026-01-15T19:51:00.000Z`) seemed "way off base" compared to the `entry.time` (`11:51`). This suggests a non-standard event creation or modification process.

## Changes
- **Root Cause Analysis**: Identified that the "EventID=EntryID" anomaly was caused by legacy code in `src/routes/log/+page.svelte` (since removed) that manually appended rows using local data.
- **Double-Write Fix**: Discovered and fixed a bug in `src/routes/entry/+page.svelte` where `entryUpdated` and `entryDeleted` events were being written twice: once via Redux dispatch (correct) and once via manual `appendRow` (duplicate).
- **Cleanup**: Removed the manual `appendRow` logic from `src/routes/entry/+page.svelte` and removed unused imports in `store.ts` and `log/+page.svelte`.
- **Audit**: Verified that `appendRow` is now exclusively used in `sheets.ts` and `sync-manager.ts`.

## Verification
- See [Walkthrough](./docs/walkthrough_timestamp_anomaly.md) for detailed investigation and verification steps.
- **Manual Test**: Editing or deleting an entry now produces exactly one event row in the backend sheet.
