// Image search service with Generative Fallback
// Uses Pollinations.ai if no Google Search keys are present.

/**
 * Searches for an image URL based on the query.
 * @param query The food description or search term
 * @returns A promise that resolves to an image URL
 */
export async function searchFoodImage(query: string): Promise<string> {
    console.log(`[ImageSearch] Searching for: "${query}"`);

    // 1. Try Google Custom Search Engine (CSE) if configured
    const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const cx = import.meta.env.VITE_GOOGLE_SEARCH_CX;

    if (apiKey && cx) {
        try {
            console.log('[ImageSearch] Using Google CSE');
            const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${apiKey}&searchType=image&num=1&safe=high`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                return data.items[0].link;
            }
            console.warn('[ImageSearch] CSE returned no results, falling back.');
        } catch (e) {
            console.error('[ImageSearch] CSE failed', e);
        }
    }

    // 2. Fallback: Generative AI via Pollinations.ai
    // This provides a high-quality, free, "search-like" result without API keys.
    console.log('[ImageSearch] Using Pollinations.ai Fallback');
    const safeQuery = encodeURIComponent(query);
    // Add "realistic food photography" to prompt to ensure style consistency
    // seed is random if not specified, which is fine
    return `https://image.pollinations.ai/prompt/realistic%20food%20photography%20of%20${safeQuery}?width=1024&height=1024&nologo=true`;
}
