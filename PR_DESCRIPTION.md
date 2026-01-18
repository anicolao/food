# Fix Gemini API 403 Forbidden Error

## Description
Restores the `generative-language.retriever` OAuth scope which is required for the Gemini API `generateContent` method. This scope was missing, causing 403 Forbidden errors.

## Changes
- **src/lib/auth.ts**: Added `https://www.googleapis.com/auth/generative-language.retriever` to `SCOPES`.
- **src/routes/privacy/+page.svelte**: Updated privacy policy to document this scope.

## Context
Original User Request:
> Looks like I got too aggressive removing scopes. I am now getting 
> POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent 403 (Forbidden)
> window.fetch @ fetcher.js?v=8618c5bb:66
> analyzeFood @ gemini.ts:112
> await in analyzeFood
> handleTextAnalyze @ +page.svelte:333
> analyze @ +page.svelte:533
> (anonymous) @ chunk-5QCNSHAL.js?v=8618c5bb:3385
> done @ VoiceRecorder.svelte:201
> handle_event_propagation @ chunk-YTF3ZZG2.js?v=8618c5bb:4402Understand this error
> +page.svelte:374 Error: Gemini API Error: 403 - {
>   "error": {
>     "code": 403,
>     "message": "Request had insufficient authentication scopes.",
>     "status": "PERMISSION_DENIED",
>     "details": [
>       {
>         "@type": "type.googleapis.com/google.rpc.ErrorInfo",
>         "reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
>         "metadata": {
>           "method": "google.ai.generativelanguage.v1beta.GenerativeService.GenerateContent",
>           "service": "generativelanguage.googleapis.com"
>         }
>       }
>     ]
>   }
> }
> 
> What is the *minimum* scope we require for this API to succeed? Add it to the OAuth scopes and privacy policies.
