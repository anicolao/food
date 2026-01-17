# Graphics Improvements: Neon/Glassmorphic Icons

## User Request

> We need to use nano-banana to do some graphics fixups.
>
> The application icon should be more in the glassmorphic neon on black style, and be optimized to look good both on Android and iOS.
>
> The sync failure icon needs to be more like the other sync status icons, a neon glow against a pure black field.
>
> The pending status and offline status need to be regenerated without words (currently they have words). Don't tell it to remove the words, just remake them without words.
>
> The sync icon needs to have only one neon line in the outline instead of the double line. You can probably get a good result just by regenerating.
> 
> What I'd do is provide the good sync icon "icon-status-synced" as the example to follow and ask for the other ones to regeneraete them; and then amke the applicaiton icon in with a similar prompt but make sure it knows the app icon goes on both android and iOS homescreens. I'd prefer if the app icon didn't have a white field in teh background.

### User Comments / Feedback

> use nix if you need to install software for image processing

> I interrupted you because you seemed stuck copying the files (!?). Let's try again but you can skip the 'synced' one because I like the existing icon fine and don't like the new one

> OK I interrupted you because the commands weren't working for you,and I copied the images by hand. But the sips command you are trying to use makes JPG not PNG, so I think you probabkyl want to edit flake.nix and install magick or similar to do the resize job with nix develop -c

> OK I quit and restarted, because CLI tools didn't seem to be working for you. HOpefully this fixes it, continue

> OK let's follow WALKTHROUGH.md [sic] and make a PR of the icon changes that are now in teh right place as open files in the repo. You'll have to regenerate e2e screenshots, since the icons are new

## Changes

- **App Icon**: Updated to a neon healthy-food symbol on pure black. Resized for Android (192x192, 512x512) and iOS.
- **Sync Status Icons**: 
    - `icon-status-error`: Neon red exclamation/cloud.
    - `icon-status-pending`: Neon yellow hourglass (no text).
    - `icon-status-offline`: Neon grey disconnected cloud (no text).
    - `icon-status-synced`: Retained original (user preference).
- **Configuration**: Added `imagemagick` to `flake.nix` for CLI image processing.
- **E2E**: Updated screenshots to reflect new icons.

## Verification
- Verified icon placement and dimensions.
- E2E tests passed with updated snapshots.
