# Polishing Macro Settings UI

## Summary
This PR implements comprehensive polishing for the Macro Settings UI. It addresses visual regressions, layout constraints, and specific visual artifacts like glow clipping and segment overlap issues. It also enhances interactivity by making the chart segments and center calorie target editable.

## Changes
- **Visual Polish**:
    - Implemented "Butt-Cap + Start-Circle" strategy for Donut Chart segments to fix cyan glow protrusion.
    - Added "Blocker Circle" behind red cap to prevent edge artifacts.
    - Removed default focus outline from chart segments.
    - Restored styling for "Sign Out" button and input fields.
- **Layout**:
    - Removed "Macro Split" title to reduce height.
    - Removed separate "Daily Target" row and moved interaction to chart center.
    - Compacted vertical spacing.
- **Interactivity**:
    - Made center calorie text an editable input.
    - Made chart segments clickable (increments percentage).

## Original User Prompt
The user's main objective is to polish the Macro Settings UI. This involves:
1. Fixing styling regressions.
2. Resolving Donut Chart visual issues.
3. Improving layout.

## Relevant User Comments

> Ok the biggest problem remaining is the cyan glow. If we can but-end one end of the arc and round cap the other end, that should fix it - is that possible?

> Also the UI is still a shade too tall. I think we can just remove the "Macro Split" title on the chart card and it'll fit nicely.

> So very close. I can see an edge around the red ball - maybe this is caused by the blocker circle? Whatever causes it, it must go - the circle must seem to be part of the red not overlapping it.

> A very strange border artifact appears only when the user clicks on the chart to edit it (screenshot attached). Otherwise this is close to perfect.
