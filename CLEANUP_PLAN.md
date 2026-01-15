# Cleanup Plan

Date: 2026-01-15
Based on review of: `STATE_OF_THE_UNION.md`, `STATE_OF_THE_UNION_AG.md`

## Executive Summary

This plan distills the findings from the comprehensive State of the Union reviews into a prioritized list of actionable items. The focus is on correcting logical errors, ensuring data integrity, and improving the production readiness of the application code.

## Prioritized Items

### 1. Fix Authentication Token Revocation (Bug) [FIXED]
**Severity:** Medium | **Effort:** Low

- **Issue:** In `src/lib/auth.ts`, the `accessToken` is set to `null` *before* the revocation call is made. This results in `g.accounts.oauth2.revoke(null, ...)` being called, failing to actually revoke the token on Google's side.
- **Location:** `src/lib/auth.ts`
- **Action:** Store the token in a temporary variable before nullifying the state, then pass the stored token to the revoke function.
- **Status:** **Fixed** in PR #38. `signOut` now captures the token before revocation. Also implemented 48h silent recovery window.

### 2. Implement Redux Event Store Idempotency (Data Safety)
**Severity:** Medium | **Effort:** Medium

- **Issue:** The application relies on event sourcing but lacks robust idempotency checks for events other than `log/entryConfirmed`. Events like `log/entryUpdated` or `log/entryDeleted` could potentially be replayed (e.g., from sheet sync), causing data corruption or crashes.
- **Location:** `src/lib/store.ts`
- **Action:** Implement a mechanism to track processed event IDs or usage of a `Set` to ensure no event is processed more than once, regardless of type.

### 3. Add Error Notifications for Sync Failures (UX/Reliability)
**Severity:** Medium | **Effort:** Medium

- **Issue:** Users are not notified when synchronization with Google Sheets fails. Errors are logged to the console, but the UI may remain in a "saved" state while the backend failed, leading to potential data loss awareness gaps.
- **Location:** `src/routes/entry/+page.svelte`, `src/lib/store.ts`
- **Action:** Replace silent `console.error` calls with a user-facing Toast notification system to alert users when a save/sync operation fails.

### 4. Remove Production Debug Logging (Code Hygiene)
**Severity:** Low | **Effort:** Low

- **Issue:** There are numerous `console.log` statements, some tagged with `[CI-DEBUG]`, that are liable to leak into the production build. This includes logging of potentially sensitive session identifiers.
- **Location:** `src/lib/auth.ts`, `src/lib/google-photos.ts`, `src/routes/log/+page.svelte`
- **Action:** Audit and remove all `console.log` statements. For necessary debug info, implement a conditional logger that checks for `import.meta.env.DEV`.

### 5. Harden Type Definitions (Maintainability)
**Severity:** Low | **Effort:** Medium

- **Issue:** Usage of `@ts-ignore` and `any` bypasses TypeScript safety, particularly around external libraries (`exifr`) and API responses (`Google Photos`). This hides potential runtime errors.
- **Location:** `src/routes/log/+page.svelte`, `src/lib/google-photos.ts`
- **Action:** Create proper TypeScript interfaces for the Google Photos API responses and correct the library usage types to eliminate `@ts-ignore`.
