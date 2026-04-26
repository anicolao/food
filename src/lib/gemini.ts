import { ensureValidToken } from './auth';
import type { LogEntry, SettingsState } from './store';

export interface NutritionEstimate {
    is_label: boolean;
    item_name: string;
    rationale?: string;
    calories: number;
    fat: { total: number };
    carbohydrates: { total: number };
    protein: number;
    searchQuery?: string; // For text/voice inputs

    // Detailed Nutrients
    details?: {
        saturatedFat?: number;
        transFat?: number;
        cholesterol?: number;
        sodium?: number;
        potassium?: number;
        calcium?: number;
        iron?: number;
        fiber?: number;
        sugar?: number;
        addedSugar?: number;
        caffeine?: number;
        alcohol?: number;
    };
}

const SYSTEM_PROMPT = `
You are an expert dietician. Analyze the provided input (image or text description).
1. If multiple images are provided, treat them as different angles or components of a **single meal/entry**. Aggregate the nutrition facts into one total estimate.
2. If it is a **Nutrition Facts label**, extract the data exactly as shown.
3. If it is a **food item/meal**, estimate the nutrition facts based on visible portion sizes and **standard Canadian nutrient values**.
4. If the input is **text only**, estimate based on standard portions for the described items.
5. **ALWAYS** provide a "searchQuery" field: a short, descriptive string to search for an image of this food (e.g., "Starbucks Grande Latte with oat milk" or "Grilled Salmon with Asparagus").
6. **CRITICAL**: Return the data **exclusively** in the following JSON format. Ensure all numerical values are numbers, not strings. Null values are acceptable if the data is genuinely unknown, but **estimate them** if possible for standard foods.

Structure:
{
  "is_label": boolean,
  "item_name": "string",
  "rationale": "string",  // Briefly explain the estimates
  "calories": number,
  "fat": { "total": number },
  "carbohydrates": { "total": number },
  "protein": number,
  
  "details": {
      "saturatedFat": number | null, // g
      "transFat": number | null,     // g
      "cholesterol": number | null,  // mg
      "sodium": number | null,       // mg
      "potassium": number | null,    // mg
      "calcium": number | null,      // mg (Estimate mg, convert from %DV if needed: 1100mg base)
      "iron": number | null,         // mg (Estimate mg, convert from %DV if needed: 14mg base)
      "fiber": number | null,        // g
      "sugar": number | null,        // g
      "addedSugar": number | null,   // g
      "caffeine": number | null,     // mg
      "alcohol": number | null       // g
  },

  "searchQuery": "string"
}
`;

export interface ImageInput {
    base64: string;
    mimeType: string;
}

export async function analyzeFood(inputs: { images?: ImageInput[], text?: string }, previousRationale?: string, userCorrection?: string): Promise<NutritionEstimate> {
    const token = await ensureValidToken();
    if (!token) throw new Error('User not authenticated for Gemini analysis');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

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

export async function getAINutritionistFeedback(logs: LogEntry[], settingsSummary: string, emaSummary: string): Promise<string> {
    const token = await ensureValidToken();
    if (!token) throw new Error('User not authenticated for AI feedback');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

    const prompt = `
Act as a Canadian Registered Dietitian. Provide evidence-based nutrition advice strictly aligned with the 2019 Canada Food Guide and Health Canada’s Dietary Guidelines.

Core Constraints:

Proportions Over Portions: Prioritize the 'Plate Model' (1/2 vegetables/fruits, 1/4 whole grains, 1/4 protein).

Regional Accuracy: Reference Canadian protein sources (e.g., pulses, lean game, North Atlantic fish) and local seasonal produce.

Metrics: Use Metric units (grams, milliliters) and % Daily Value based on Canadian labeling laws (e.g., 2,300mg sodium limit).

Tone: Professional, encouraging, and mindful of Canada's diverse food environment.

Task: Review the daily log and provide at least one thing to focus on and one piece of positive feedback.

CONTEXT DATA:
1. LAST 14 DAYS FOOD LOGS:
${JSON.stringify(logs.map(l => ({ date: l.date, time: l.time, description: l.description, calories: l.calories, protein: l.protein, carbs: l.carbs, fat: l.fat })))}

2. USER SETTINGS SUMMARY:
${settingsSummary}

3. 14-DAY EMA TRENDS:
${emaSummary}

Please provide your response in HTML format (using basic tags like <p>, <ul>, <li>, <strong>, <h4>). Do not include <html> or <body> tags.
`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${err}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('No content in Gemini response');

    return candidate;
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
