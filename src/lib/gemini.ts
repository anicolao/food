import { ensureValidToken } from './auth';

export interface NutritionEstimate {
    is_label: boolean;
    item_name: string;
    rationale?: string;
    calories: number;
    fat: { total: number };
    carbohydrates: { total: number };
    protein: number;
    searchQuery?: string; // For text/voice inputs
    // ... expand as needed
}

const SYSTEM_PROMPT = `
You are an expert dietician. Analyze the provided input (image or text description).
1. If multiple images are provided, treat them as different angles or components of a **single meal/entry**. Aggregate the nutrition facts into one total estimate.
2. If it is a **Nutrition Facts label**, extract the data exactly as shown.
3. If it is a **food item/meal**, estimate the nutrition facts based on visible portion sizes and standard values using Canadian standards.
4. If the input is **text only**, estimate based on standard portions for the described items.
5. **ALWAYS** provide a "searchQuery" field: a short, descriptive string to search for an image of this food (e.g., "Starbucks Grande Latte with oat milk" or "Grilled Salmon with Asparagus").
6. Return the data **exclusively** in the following JSON format (a SINGLE object, not a list):
{
  "is_label": boolean,
  "item_name": "string",
  "rationale": "string",
  "calories": number,
  "fat": { "total": number },
  "carbohydrates": { "total": number },
  "protein": number,
  "searchQuery": "string"
}
`;

export interface ImageInput {
    base64: string;
    mimeType: string;
    // ...
    // Note: If you need to add more fields, do it here. 
    // The previous code had a syntax error here if I just remove `}`? No.
}
// I will just supply the whole file content for safety or minimal changes.

export async function analyzeFood(inputs: { images?: ImageInput[], text?: string }, previousRationale?: string, userCorrection?: string): Promise<NutritionEstimate> {
    const token = await ensureValidToken();
    if (!token) throw new Error('User not authenticated for Gemini analysis');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    let prompt = SYSTEM_PROMPT;

    if (inputs.text) {
        prompt += `\n\nUSER TEXT DESCRIPTION: "${inputs.text}"\n`;
    }

    if (previousRationale && userCorrection) {
        prompt += `
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${previousRationale}".
        The user has provided this correction: "${userCorrection}".
        Please re-evaluate the nutrition facts based on this correction.
        `;
    }

    const parts: any[] = [{ text: prompt }];

    if (inputs.images) {
        inputs.images.forEach(img => {
            parts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.base64
                }
            });
        });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            contents: [{
                parts: parts
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${err}`);
    }

    const result = await response.json();
    // Safety check for response structure
    const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('No content in Gemini response');

    return JSON.parse(candidate) as NutritionEstimate;
}

export async function generateImageWithGemini(prompt: string): Promise<string | null> {
    const token = await ensureValidToken();
    if (!token) return null;

    // Use Imagen 3 endpoint
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                instances: [{ prompt: `A delicious, professional food photography shot of: ${prompt}. Studio lighting, high quality.` }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1"
                }
            })
        });

        if (!response.ok) {
            console.warn('Gemini Image Gen failed', response.status, await response.text());
            return null;
        }

        const result = await response.json();
        const base64 = result.predictions?.[0]?.bytesBase64Encoded;
        if (base64) {
            return `data:image/jpeg;base64,${base64}`;
        }
    } catch (e) {
        console.error('Image gen error', e);
    }

    return null;
}
