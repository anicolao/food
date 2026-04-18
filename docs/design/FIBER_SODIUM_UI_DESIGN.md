# Design Doc: Fiber and Sodium Tracking UI

## Objective
To provide users with clear, actionable visibility into their Fiber and Sodium intake, helping them meet heart health and digestive goals without cluttering the primary macronutrient experience.

## User Personas
1.  **Heart-Health Focused**: Needs to stay under a daily Sodium limit (e.g., <2300mg) to manage blood pressure.
2.  **Gut-Health Focused**: Aims to hit a minimum Fiber target (e.g., >30g) for satiety and digestion.
3.  **The "Quantified Self"**: Wants a complete nutritional picture but prioritizes Calories/Macros for weight management.

## UI/UX Design

### 1. Dashboard (The "Health Bar" Row)
A new section will be added to the main dashboard (`src/routes/+page.svelte`) directly below the three primary macro bubbles.

*   **Component**: `HealthSummary.svelte`
*   **Visual Style**:
    *   Uses horizontal progress bars with rounded caps to distinguish them from the circular macro rings.
    *   **Fiber**: Emerald/Green gradient (`#43e97b` to `#38f9d7`).
    *   **Sodium**: Gold/Amber gradient (`#f6d365` to `#fda085`).
*   **Behavior**:
    *   **Fiber**: Progresses toward a *minimum* goal.
    *   **Sodium**: Progresses toward a *maximum* limit. The bar turns from Amber to Soft Red if the limit is exceeded.
*   **Mobile Layout**: Bars are stacked vertically or placed side-by-side if width permits.

#### Mockup (Mobile Dashboard)
```text
+---------------------------------------+
|          [ Calories Ring ]            |
|            1850 / 2200                |
|               kcal                    |
|                                       |
|  [Pro]         [Carbs]         [Fat]  |
|  120/150g      210/250g        55/70g |
|                                       |
|  -----------------------------------  |
|  FIBER   [================---] 28/35g |
|  SODIUM  [==========---------] 1.2/2.3g|
|  -----------------------------------  |
|                                       |
|  [ Recent Activity Feed ]             |
+---------------------------------------+
```

### 2. Log Entry (`NutritionForm`)
The existing `NutritionForm.svelte` already contains Fiber and Sodium fields, but they are hidden behind a "Details" toggle.

*   **Change**: If a user has enabled "Health Tracking" or set a goal for Fiber/Sodium in settings, these fields will be **pinned** to the top level of the form (visible without toggling).
*   **Visual Style**: Subtle icons next to labels (e.g., a wheat stalk for fiber, a salt shaker for sodium).

### 3. Settings (Goal Configuration)
A new section in `src/routes/settings/+page.svelte` will allow users to customize these targets.

*   **Inputs**:
    *   **Fiber Daily Goal (g)**: Default 25g (women) / 38g (men).
    *   **Sodium Daily Limit (mg)**: Default 2300mg.
*   **Toggle**: "Show health metrics on dashboard" (True by default if targets are set).

#### Mockup (Settings Page)
```text
+---------------------------------------+
|  < Settings                           |
+---------------------------------------+
|  Daily Calorie Target: [ 2200 ]       |
|                                       |
|  Macro Ratios:                        |
|  [ Protein 30% | Fat 30% | Carbs 40% ]|
|                                       |
|  HEALTH TARGETS                       |
|  Fiber Goal (g):      [ 35 ]          |
|  Sodium Limit (mg):   [ 2300 ]        |
|                                       |
|  [X] Show on Dashboard                |
+---------------------------------------+
```

## User Flows

### Flow A: Setting Up Tracking
1.  User navigates to **Settings**.
2.  User scrolls to **Health Targets**.
3.  User adjusts Fiber goal to 35g and Sodium to 1500mg.
4.  User returns to **Dashboard**.
5.  New "Health Bar" row appears with their current daily totals.

### Flow B: Logging a High-Sodium Meal
1.  User logs a "Soy Sauce Ramen".
2.  Gemini AI estimates sodium at 1800mg.
3.  User confirms entry.
4.  Dashboard Sodium bar fills significantly and turns red if the daily limit is now exceeded.
5.  User taps the Sodium bar to see a breakdown of the day's sodium contributors.

## Implementation Plan (Technical)

1.  **Redux Store**:
    *   Extend `SettingsState` in `store.ts` to include `fiberTarget` and `sodiumTarget`.
    *   Update `DailyStats` projection to aggregate `totalFiber` and `totalSodium`.
2.  **Components**:
    *   Create `HealthBar.svelte` as a reusable horizontal progress component.
    *   Create `HealthSummary.svelte` to group these bars.
3.  **Dashboard**:
    *   Integrate `HealthSummary` into `src/routes/+page.svelte`.
4.  **Settings**:
    *   Add the new inputs to the settings page and wire them to Redux.
