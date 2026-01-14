// Image search service with Generative Fallback
// Uses Pollinations.ai if no Google Search keys are present.

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL
 */
// Image search service using Gemini Grounding (User OAuth)
import { findImageWithGemini } from '$lib/gemini';

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL, or null if not found.
 */
export async function searchFoodImage(query: string): Promise<string | null> {
    console.log(`[ImageSearch] Searching for: "${query}"`);

    // 1. Try Gemini Search (User OAuth)
    try {
        const geminiUrl = await findImageWithGemini(query);
        if (geminiUrl) {
            console.log('[ImageSearch] Found via Gemini:', geminiUrl);

            // Verify reachability (filter out 404s)
            try {
                const res = await fetch(geminiUrl);
                if (res.status === 404) {
                    console.warn('[ImageSearch] Gemini returned 404, ignoring');
                    return null;
                } else {
                    // 200, 403 (CORS), etc. - attempt to use it
                    return geminiUrl;
                }
            } catch (e) {
                // Network/CORS error on verification - optimistic return
                return geminiUrl;
            }
        }
    } catch (e) {
        console.warn('[ImageSearch] Gemini search failed', e);
    }

    return null;
}
