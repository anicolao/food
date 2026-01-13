# Description
Implemented PWA 'Add to Homescreen' support with custom icons and manifest.

## User Prompt
When the user adds the bookmark to homescreen on iOS or Android, I want them to get a smooth, as app-like experience as possible from the resulting bookmark. Let's update our site so that it looks as near as possible to a native app when bookmarked this way. Use nano banana to generate a homescreen icon that is visually similar to the rest of the UI design, by showing it existing mockups it has made as inspiration.

## Changes
- Created `static/manifest.webmanifest`.
- Generated app icons (192, 512, apple-touch-icon).
- Updated `src/app.html` with iOS meta tags.
- Added documentation in `docs/pwa/`.
