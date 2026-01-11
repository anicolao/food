import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
    if (!API_KEY) throw new Error('Gemini API Key missing');

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: "application/json" } });

    const result = await model.generateContent([
        SYSTEM_PROMPT,
        {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType
            }
        }
    ]);

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text) as NutritionEstimate;
}
