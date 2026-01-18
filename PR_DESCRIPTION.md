# Fix OAuth Scopes

## Description
This PR reduces the OAuth scopes requested by the application. Specifically, it removes `https://www.googleapis.com/auth/spreadsheets` (full access to all sheets) and relies on `https://www.googleapis.com/auth/drive.file` (access only to files created/opened by the app).

## Rationale
The application was requesting overreaching permissions ("read *all* my google sheets"), causing user concern. The app's architecture manages its own specific files (`FoodLog` folder and `TheFoodTrackerEventLog`), so `drive.file` is sufficient and follows the principle of least privilege.

## Verification
Manual verification was performed to confirm:
1.  The Google Consent Screen now requests narrower permissions.
2.  The application can still read/write to the food log.

## User Prompt & Context
> Our OAuth scopes seem overreaching on sheets for some reason. When I sign in Google tells me the app can "read *all* my google sheets". What scope is triggering that? Do we need it? If not, let's stop asking for it.
