# Audit Event Logging Gaps and Implement Lifecycle Events

## Description
Implements the "Facts on the Ground" event lifecycle as detailed in `docs/DESIGN_REVIEW.md`. This ensures that all significant user actions (Media Upload, AI Analysis, Voice Capture) are recorded as distinct events, even if the final "Log Entry" save fails or is incomplete.

### Key Changes
-   **Store Schema**: Added `mediaIds` to `LogEntry` to link entries to their media lifecycle events.
-   **Media Lifecycle**: Refactored `log/+page.svelte` to dispatch `media/uploadStarted` immediately upon selection, and `media/uploadCompleted` or `media/uploadFailed` asynchronously.
-   **AI Lifecycle**: Wrapped Gemini analysis calls in `log/+page.svelte` with `ai/analysisRequested` and `ai/analysisFailed` events.
-   **Voice Lifecycle**: Updated `VoiceRecorder.svelte` to dispatch `voice/captureCompleted` with raw transcript and duration before analysis.

## Original User Prompt
> Read DEVELOPMENT.md and designs/DESIGN_REVIEW.md. Implement the ideas in the design review and then follow WORKFLOW.md to create a PR.

## Verification
-   **Manual**: Verified `svelte-check` passes with no errors.
-   **Automated**: (Ideally) E2E tests should verify these events appear in the store. Existing `002-log-food` test ensures regression safety for the critical path.
