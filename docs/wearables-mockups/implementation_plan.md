# Implementation Plan: Wearables Mockup Rendering

We need to convert the SVG mockups in `WEARABLES_DESIGN_ALTERNATIVES.md` into actual visual images (PNG) as requested by the user.

## Proposed Changes

### 1. Rendering Script
- Create a script (e.g., `scripts/render-mockups.js`) that:
    - Extracts SVGs from `WEARABLES_DESIGN_ALTERNATIVES.md`.
    - Uses `playwright` to render them.
    - Saves the output to `design/mockups/wearables_apple.png` and `design/mockups/wearables_android.png`.

### 2. Documentation Update
- Replace the raw SVG markup in `WEARABLES_DESIGN_ALTERNATIVES.md` with standard Markdown image links:
    - `![Apple Watch Mockup](design/mockups/wearables_apple.png)`
    - `![Android Wear Mockup](design/mockups/wearables_android.png)`

### 3. Visual Improvements
- While rendering, consider adding a slight device frame or background if it enhances the "mockup" feel.

## Verification Plan
- Run the rendering script.
- Inspect the generated PNGs in `design/mockups/`.
- Verify `WEARABLES_DESIGN_ALTERNATIVES.md` renders correctly with images.
