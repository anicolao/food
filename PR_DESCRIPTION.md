# Offline Support Design

This PR introduces the design document for implementing offline support using IndexedDB and Google Sheets synchronization.

## User Prompt

Read CLEANUP.md DEVELOPMENT.md and WORKFLOW.md. I'd like to address cleanup item #2 by adding an indexed db table that is a write-through cache to the underlying google sheet. On load, the app should replay from cache and fetch from the sheet only those actions which are new on the server. 

Write a design doc OFFLINE_SUPPORT.md that describes the setup in detail, including how idempotency will work, how this will work if multiple clients are disconnected and log different food items, what UI is needed to indicate an offline/out of sync state, and any considerations on the size limit of a single google sheet and how to use multiple subsheets in the spreadsheet to enable evading the single google sheet limit. 

Read WORKFLOW.md and follow procedures to put this new design document up as a PR.

## Changes

-   Added `OFFLINE_SUPPORT.md`: Detailed architecture for Local-First Sync, Idempotency, and Sheet Partitioning.
