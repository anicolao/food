## Summary
This PR adds the `UX_SCREEN_TRANSITIONS.md` design document, detailing the proposed screen transition strategy for the Food application. 

## Design Highlights
- **Navigation Topology**: Hybrid Spatial + Contextual system.
- **Horizontal Rules**:
  - To `/settings`: Always Enter Right.
  - To `/`: Always Enter Left.
- **Vertical Rules** (Highest Priority):
  - To `/log`: Slide Up.
  - From `/log`: Slide Down.
- **Drill Down**: To `/entry`: Slide Left (Enter Right).
- **Default**: Crossfade.
- **Implementation**: Priority-based heuristic resolver in `+layout.svelte`.

## Original User Request
Currently the screens in the food app just "pop" into place. Instead, every major transition should slide components off and onto the screen simultaneously to give a physicality to all navigations. Examine the project for all navigaitons, enumerate them, and write a UX_SCREEN_TRANSITIONS.md to define all the instances where a screen transition is needed, what direction components go, and how to implement it. Write the design only, and then follow WORKFLOW.md to create a PR to review the design doc.
