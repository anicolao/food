// Image search service with Generative Fallback
// Uses Pollinations.ai if no Google Search keys are present.

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL
 */
// Image search service using Gemini Grounding (User OAuth)
import { findImageWithGemini } from '$lib/gemini';

const PLACEHOLDERS: Record<string, string> = {
    'coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80',
    'latte': 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1000&q=80',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
    'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
    'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
    'breakfast': 'https://images.unsplash.com/photo-1533089862017-ec329abb0a51?auto=format&fit=crop&w=1000&q=80',
    'default': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80' // Healthy bowl
};

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL
 */
export async function searchFoodImage(query: string): Promise<string> {
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
                    console.warn('[ImageSearch] Gemini returned 404, falling back');
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

    // 2. Fallback: Local Placeholders (never fails, no 403s)
    const lowerQuery = query.toLowerCase();
    for (const key of Object.keys(PLACEHOLDERS)) {
        if (lowerQuery.includes(key)) {
            return PLACEHOLDERS[key];
        }
    }

    return PLACEHOLDERS['default'];
}
