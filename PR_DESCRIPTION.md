# Fix iOS App Icon and Add Meta Tag

## Summary
This PR fixes the issue where the app icon was not appearing on the iOS homescreen. It adds the missing `mobile-web-app-capable` meta tag and converts the icon files from renamed JPEGs to actual PNG format, as iOS is strict about image formats.

## Changes
- Added `<meta name="mobile-web-app-capable" content="yes">` to `src/app.html`.
- Converted `static/apple-touch-icon.png`, `static/android-chrome-192x192.png`, and `static/android-chrome-512x512.png` from JPEG to PNG format using `sips`.

## Original User Prompt
The app icon on iOS is still not working. I notice my chrome console says <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">

Doesn't seem like this could be the culprit but something is making the app icon not load onto the homescreen.
