# Implementation Plan: AI Nutritionist in Shared View

The goal is to display the AI Nutritionist feedback in the shared data view (`src/routes/sharing/+page.svelte`), matching the experience of the main dashboard.

## Proposed Changes

### 1. Refactor AI Feedback Preparation (`src/lib/gemini.ts`)
- Move the logic that prepares the `settingsSummary`, `emaSummary`, and `recentFeedbacks` context from `src/routes/+page.svelte` to a helper function.
- This will allow the sharing view to easily generate or display feedback if needed.

### 2. Update Shared View (`src/routes/sharing/+page.svelte`)
- Add reactivity for `statsProjection` and `aiFeedbackFromStore` (derived from `statsProjection[selectedDate]?.aiFeedback`).
- Implement the `AI Nutritionist` card in the UI, similar to `src/routes/+page.svelte`.
- In the sharing view, the "Get AI Feedback" button should be visible but potentially disabled or restricted if the context is read-only. Given the persona, we want to at least show existing feedback.
- Add `HealthSummary` component to the shared view if `settings.showHealthMetrics` is enabled.

### 3. Verification
- **E2E Test**: Update `tests/e2e/121-ai-nutritionist.spec.ts` to include a test case for the sharing view.
- Verify that navigating to a shared URL with existing AI feedback correctly displays the card and content.

## Detailed UI Strategy
- The AI Nutritionist card should be placed in the `left-col` (on desktop) or below the stats (on mobile), consistent with the main dashboard.
- If no feedback exists and the view is read-only, we should display a placeholder message "No AI feedback generated for this day."
