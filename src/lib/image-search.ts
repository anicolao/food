// Image search service with Generative Fallback
// Uses Pollinations.ai if no Google Search keys are present.

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL
 */
// Image search service using Gemini Grounding (User OAuth)
import { findImageWithGemini, generateImageWithGemini } from '$lib/gemini';

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL, or null if not found.
 */
export async function searchFoodImage(query: string): Promise<string | null> {
    console.log(`[ImageSearch] Searching for: "${query}"`);

    // 1. Try Gemini Search (User OAuth)
    let imageUrl: string | null = null;
    try {
        const geminiUrl = await findImageWithGemini(query);
        if (geminiUrl) {
            console.log('[ImageSearch] Found via Gemini:', geminiUrl);

            // Verify reachability (filter out 404s)
            try {
                const res = await fetch(geminiUrl);
                if (res.status === 404) {
                    console.warn('[ImageSearch] Gemini returned 404, ignoring');
                } else {
                    // 200, 403 (CORS), etc. - attempt to use it
                    imageUrl = geminiUrl;
                }
            } catch (e) {
                // Network/CORS error on verification - optimistic return
                imageUrl = geminiUrl;
            }
        }
    } catch (e) {
        console.warn('[ImageSearch] Gemini search failed', e);
    }

    if (imageUrl) return imageUrl;

    // 2. Fallback: Generate Image (Imagen 3)
    console.log('[ImageSearch] Search failed/404. Attempting to generate image...');
    try {
        const generatedUrl = await generateImageWithGemini(query);
        if (generatedUrl) {
            console.log('[ImageSearch] Generated image successfully.');
            return generatedUrl;
        }
    } catch (e) {
        console.warn('[ImageSearch] Generation failed', e);
    }

    return null;
}
