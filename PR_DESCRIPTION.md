Fix Auth Refresh on Interaction

## User Prompt
Auth is not working the way I expected it to. When I come back to the app after a long absence, and try to log a food, I am never authenticated, and have to sign out and in again.

I thought we'd changed it so that on every click we would refresh auth. If that was true, auth would be refreshed when we enter the log screen and I should not see the problem. Auth refresh does *require* a click in the browser, so if we're doing it without a user action driving it that could be the problem.
