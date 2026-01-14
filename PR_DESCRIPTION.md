# Fix Google Photos Mobile Picker

## Original Request
"Selecting photos from my Google Photos doesn't work on mobile. On my desktop it works fine, but on my phone there's no reaciton when I tap the button and eventually I get a 'selection timed out' popup. 

I think on all platforms the photos selector should be inline rather than a popup, and perhaps that will fix the problem."

## Additional Context
"It just keeps re-requesting permission every time now, not making progress"

"Error: Failed to list library items: 403  - {
  "error": {
    "code": 403,
    "message": "Request had insufficient authentication scopes.",
    "status": "PERMISSION_DENIED"
  }
}"

"Still no dice. Are you sure this API isn't deprecated in favour of the picker?"

## Changes
- Replaced the deprecated Google Photos Library API polling mechanism with the Google Photos Picker API.
- Implemented a robust "visibility-aware" polling strategy to handle mobile browser throttling (checking for photos immediately when the app regains focus).
- Updated authentication scopes to `photospicker.mediaitems.readonly`.
- Added a "Sign Out & Retry" flow for stuck authentication states.
- Cleaned up the UI to remove the popup loop and provide clear status feedback.
