import { getAccessToken } from './auth';

export interface NutritionEstimate {
    is_label: boolean;
    item_name: string;
    calories: number;
    fat: { total: number };
    carbohydrates: { total: number };
    protein: number;
    // ... expand as needed
}

const SYSTEM_PROMPT = `
You are an expert dietician. Analyze the provided image.
1. If it is a **Nutrition Facts label**, extract the data exactly as shown.
2. If it is a **food item/meal**, estimate the nutrition facts based on visible portion sizes and standard values using Canadian standards.
3. Return the data **exclusively** in the following JSON format:
{
  "is_label": boolean,
  "item_name": "string",
  "calories": number,
  "fat": { "total": number },
  "carbohydrates": { "total": number },
  "protein": number
}
`;

export async function analyzeImage(imageBase64: string, mimeType: string): Promise<NutritionEstimate> {
    const token = getAccessToken();
    if (!token) throw new Error('User not authenticated for Gemini analysis');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: imageBase64
                        }
                    }
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
