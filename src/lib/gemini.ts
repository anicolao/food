import { ensureValidToken } from './auth';
import { store, type LogEntry, type SettingsState } from './store';
import { toasts } from './toast';
import { getDatesRange, getMetricEMASeries } from './metrics';

let cachedFlashModel: string | null = null;

export async function listAvailableModels(token: string): Promise<any[]> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models';
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Gemini models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
}

export async function getLatestFlashModel(token: string): Promise<string> {
    // 1. Check if user has a preferred model in store
    const preferredModel = store.getState().config.geminiModel;
    if (preferredModel) {
        if (cachedFlashModel !== preferredModel) {
            toasts.info(`Using AI model: ${preferredModel}`);
            cachedFlashModel = preferredModel;
        }
        return preferredModel;
    }

    if (cachedFlashModel) return cachedFlashModel;

    try {
        const models = await listAvailableModels(token);
        const flashModels = models
            .filter((m: any) => 
                m.name && 
                m.name.includes('flash') && 
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent')
            )
            .map((m: any) => m.name.replace('models/', ''))
            .sort((a: string, b: string) => {
                // Priority 1: -latest
                if (a.endsWith('-latest') && !b.endsWith('-latest')) return -1;
                if (!a.endsWith('-latest') && b.endsWith('-latest')) return 1;
                // Priority 2: Lexicographical order (highest version)
                return b.localeCompare(a);
            });

        if (flashModels.length > 0) {
            const picked = flashModels[0];
            if (cachedFlashModel !== picked) {
                toasts.info(`Using AI model: ${picked}`);
                cachedFlashModel = picked;
            }
            return picked;
        }
    } catch (e) {
        console.warn('Error fetching Gemini models', e);
        throw e; // No more hardcoded fallback
    }

    throw new Error('No valid Gemini Flash models found');
}

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

    const model = await getLatestFlashModel(token);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

export function prepareFeedbackContext(
    selectedDate: string,
    allLogs: LogEntry[],
    settings: SettingsState,
    stats: Record<string, any>
) {
    const endDate = selectedDate;
    const daysBackLogs = 14;
    const logDates = getDatesRange(endDate, daysBackLogs);
    
    const last14DaysLogs = allLogs.filter(l => logDates.includes(l.date));
    
    let settingsSummary = `Target Calories: ${settings.targetCalories} kcal\n`;
    settingsSummary += `Macro Ratios: Protein ${settings.macroRatios.protein * 100}%, Fat ${settings.macroRatios.fat * 100}%, Carbs ${settings.macroRatios.carbs * 100}%\n`;
    if (settings.fiberGoal.enabled) settingsSummary += `Fiber Goal: ${settings.fiberGoal.value}g\n`;
    if (settings.sodiumGoal.enabled) settingsSummary += `Sodium Goal: ${settings.sodiumGoal.value}mg\n`;
    if (settings.sugarLimit.enabled) settingsSummary += `Sugar Limit: ${settings.sugarLimit.value}g/1000kcal\n`;
    if (settings.addedSugarLimit.enabled) settingsSummary += `Added Sugar Limit: ${settings.addedSugarLimit.value}g/1000kcal\n`;
    if (settings.satFatLimit.enabled) settingsSummary += `Saturated Fat Limit: ${settings.satFatLimit.value}g/1000kcal\n`;
    if (settings.transFatLimit.enabled) settingsSummary += `Trans Fat Limit: ${settings.transFatLimit.value}g/1000kcal\n`;
    if (settings.cholesterolLimit.enabled) settingsSummary += `Cholesterol Limit: ${settings.cholesterolLimit.value}mg/1000kcal\n`;

    const metricsToTrack = [
        { key: 'totalCalories', label: 'Calories' },
        { key: 'totalProtein', label: 'Protein' },
        { key: 'totalCarbs', label: 'Carbs' },
        { key: 'totalFat', label: 'Fat' },
        { key: 'totalFiber', label: 'Fiber', enabled: settings.fiberGoal.enabled },
        { key: 'totalSodium', label: 'Sodium', enabled: settings.sodiumGoal.enabled },
        { key: 'totalSugar', label: 'Sugar', enabled: settings.sugarLimit.enabled },
        { key: 'totalAddedSugar', label: 'Added Sugar', enabled: settings.addedSugarLimit.enabled },
        { key: 'totalSaturatedFat', label: 'Saturated Fat', enabled: settings.satFatLimit.enabled },
        { key: 'totalTransFat', label: 'Trans Fat', enabled: settings.transFatLimit.enabled },
        { key: 'totalCholesterol', label: 'Cholesterol', enabled: settings.cholesterolLimit.enabled },
    ];

    // Get two most recent feedbacks before selectedDate
    const recentFeedbacks = Object.entries(stats)
        .filter(([date, s]) => (s as any).aiFeedback && date < selectedDate)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .slice(0, 2)
        .map(([date, s]) => ({ date, feedback: (s as any).aiFeedback! }));

    let emaSummary = '';
    metricsToTrack.forEach(m => {
        if (m.enabled !== false) {
            const series = getMetricEMASeries(stats, m.key, endDate, 28, 14);
            const last14EMAs = series.slice(-14);
            emaSummary += `${m.label} 14-day EMA (last 14 days): ${last14EMAs.map(v => v.toFixed(1)).join(', ')}\n`;
        }
    });

    return {
        last14DaysLogs,
        settingsSummary,
        emaSummary,
        recentFeedbacks
    };
}

export async function getAINutritionistFeedback(
    logs: LogEntry[], 
    settings: SettingsState, 
    settingsSummary: string, 
    emaSummary: string,
    recentFeedbacks: { date: string, feedback: string }[]
): Promise<string> {
    const token = await ensureValidToken();
    if (!token) throw new Error('User not authenticated for AI feedback');

    const model = await getLatestFlashModel(token);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const prompt = `
Act as a Canadian Registered Dietitian. Provide evidence-based nutrition advice strictly aligned with the 2019 Canada Food Guide and Health Canada’s Dietary Guidelines.

Core Constraints:

Proportions Over Portions: Prioritize the 'Plate Model' (1/2 vegetables/fruits, 1/4 whole grains, 1/4 protein).

Regional Accuracy: Reference Canadian protein sources (e.g., pulses, lean game, North Atlantic fish) and local seasonal produce.

Metrics: Use Metric units (grams, milliliters) and % Daily Value based on Canadian labeling laws (e.g., 2,300mg sodium limit).

Tone: Professional, encouraging, and mindful of Canada's diverse food environment.

Task: Review the daily log and provide at least one thing to focus on and one piece of positive feedback.

Instructions: 
1. Be much briefer than usual.
2. Focus your advice on specific foods and examples from the user's logs provided below. Avoid generic advice that doesn't apply to what the user actually ate.
3. Refer to prior advice if relevant.

CONTEXT DATA:
1. LAST 14 DAYS FOOD LOGS:
${JSON.stringify(logs.map(l => {
    const details: any = {};
    if (settings.fiberGoal.enabled && l.details?.fiber !== undefined) details.fiber = l.details.fiber;
    if (settings.sodiumGoal.enabled && l.details?.sodium !== undefined) details.sodium = l.details.sodium;
    if (settings.sugarLimit.enabled && l.details?.sugar !== undefined) details.sugar = l.details.sugar;
    if (settings.addedSugarLimit.enabled && l.details?.addedSugar !== undefined) details.addedSugar = l.details.addedSugar;
    if (settings.satFatLimit.enabled && l.details?.saturatedFat !== undefined) details.saturatedFat = l.details.saturatedFat;
    if (settings.transFatLimit.enabled && l.details?.transFat !== undefined) details.transFat = l.details.transFat;
    if (settings.cholesterolLimit.enabled && l.details?.cholesterol !== undefined) details.cholesterol = l.details.cholesterol;

    return { 
        date: l.date, 
        time: l.time, 
        description: l.description, 
        calories: l.calories, 
        protein: l.protein, 
        carbs: l.carbs, 
        fat: l.fat,
        details
    };
}))}

2. USER SETTINGS SUMMARY:
${settingsSummary}

3. 14-DAY EMA TRENDS:
${emaSummary}

4. RECENT FEEDBACKS:
${JSON.stringify(recentFeedbacks)}

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
