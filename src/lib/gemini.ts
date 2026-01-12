import { getAccessToken } from './auth';

export interface NutritionEstimate {
    is_label: boolean;
    item_name: string;
    rationale?: string;
    calories: number;
    fat: { total: number };
    carbohydrates: { total: number };
    protein: number;
    // ... expand as needed
}

const SYSTEM_PROMPT = `
You are an expert dietician. Analyze the provided image(s).
1. If multiple images are provided, treat them as different angles or components of a **single meal/entry**. Aggregate the nutrition facts into one total estimate.
2. If it is a **Nutrition Facts label**, extract the data exactly as shown.
3. If it is a **food item/meal**, estimate the nutrition facts based on visible portion sizes and standard values using Canadian standards.
4. Return the data **exclusively** in the following JSON format (a SINGLE object, not a list):
{
  "is_label": boolean,
  "item_name": "string",
  "rationale": "string",
  "calories": number,
  "fat": { "total": number },
  "carbohydrates": { "total": number },
  "protein": number
}
`;

export interface ImageInput {
    base64: string;
    mimeType: string;
}

export async function analyzeImage(images: ImageInput[], previousRationale?: string, userCorrection?: string): Promise<NutritionEstimate> {
    const token = getAccessToken();
    if (!token) throw new Error('User not authenticated for Gemini analysis');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    let prompt = SYSTEM_PROMPT;
    if (previousRationale && userCorrection) {
        prompt += `
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${previousRationale}".
        The user has provided this correction: "${userCorrection}".
        Please re-evaluate the image and nutrition facts based on this correction.
        `;
    }

    const imageParts = images.map(img => ({
        inlineData: {
            mimeType: img.mimeType,
            data: img.base64
        }
    }));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
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
