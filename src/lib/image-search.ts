
// Mock image search service
// Since we don't have a Google Custom Search API key yet, we'll return
// high-quality placeholder images based on keywords or a default.

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
    console.log(`[MockImageSearch] Searching for: "${query}"`);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const lowerQuery = query.toLowerCase();

    // Simple keyword matching for better mock experience
    for (const key of Object.keys(PLACEHOLDERS)) {
        if (lowerQuery.includes(key)) {
            return PLACEHOLDERS[key];
        }
    }

    return PLACEHOLDERS['default'];
}
