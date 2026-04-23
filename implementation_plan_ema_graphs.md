# Implementation Plan: EMA Graphs

## Objective
Add 7-day Exponential Moving Average (EMA) graphs for tracked metrics (Calories, Protein, Carbs, Fat, and active micro targets) to the dashboard. The graphs will be persistently visible at the top of the desktop view and accessible via a toggle button on mobile.

## 1. Metrics Calculation (`src/lib/metrics.ts`)
Create a new utility file to calculate the historical EMA data needed for the charts.
- **`calculateEMA(data, periods)`**: Standard EMA formula calculation.
- **`getHistoricalStats(stats, endDate, daysBack)`**: Extracts a time-series array for the past `N` days (e.g., 30 days) from the Redux `stats` projection.
- **`getMetricSeries(stats, metricKey, endDate, daysBack=30)`**: Computes the 7-day EMA series for a specific metric to be plotted.

## 2. Chart Component (`src/lib/components/ui/MetricEMAChart.svelte`)
Create an SVG-based sparkline component.
- **Props**: `label` (e.g., "Calories"), `data` (array of numbers), `target` (number), `targetRange` (optional array `[min, max]`), `color` (line color).
- **Visuals**:
  - A smooth SVG `<path>` representing the EMA curve over the date range.
  - A dashed SVG `<line>` representing the `target` value.
  - Small labels for the metric name and current value.

## 3. Container Component (`src/lib/components/ui/DashboardEMAs.svelte`)
Create a component to orchestrate the charts based on the user's active goals.
- Reads `store.getState().projections.stats` and `store.getState().settings`.
- Iterates over the core metrics (Calories, Protein, Carbs, Fat).
- Iterates over active micro metrics (Fiber, Sodium, Sugar, etc.) based on their `enabled` status in settings.
- Renders a `MetricEMAChart` for each active metric, styled in a horizontal flex/grid layout that wraps nicely.

## 4. Dashboard Integration (`src/routes/+page.svelte`)
Integrate the charts into the main dashboard view.
- **Desktop**: Place `<DashboardEMAs />` at the top of the `.page-container`, immediately preceding the `.dashboard-grid`. Ensure it's visible by default using CSS media queries (e.g., `display: block` on desktop).
- **Mobile**: Add an icon button (e.g., a small line-chart icon) near the top of the view (perhaps in a new `.mobile-controls` row or near the date selector) that toggles the visibility of the `<DashboardEMAs />` component.
- Use conditional rendering and CSS (`@media (min-width: 1024px)`) to handle the distinct desktop/mobile behaviors.

## 5. Testing & Validation
- Create a new E2E test in `tests/e2e/101-ema-graphs.spec.ts` to demonstrate the mobile layout of these new metric graphs (ensuring the toggle button works and the charts are visible).
- Verify the new functionality by running `npm run test:e2e`.
- Regenerate E2E screenshots using `npm run test:e2e:update-snapshots` (or `./scripts/update-snapshots.sh`) to capture the new desktop layout and the mobile toggle state.