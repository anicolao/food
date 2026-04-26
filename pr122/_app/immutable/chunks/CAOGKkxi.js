import{e as c}from"./C86vW6yk.js";const f=`
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
`;async function h(n,t,s){const d=await c();if(!d)throw new Error("User not authenticated for Gemini analysis");const l="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";let r=f;n.text&&(r+=`

USER TEXT DESCRIPTION: "${n.text}"
`),t&&s&&(r+=`
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${t}".
        The user has provided this correction: "${s}".
        Please re-evaluate the nutrition facts based on this correction.
        `);const u=[{text:r}];n.images&&n.images.forEach(e=>{u.push({inlineData:{mimeType:e.mimeType,data:e.base64}})});const a=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${d}`},body:JSON.stringify({contents:[{parts:u}],generationConfig:{responseMimeType:"application/json"}})});if(!a.ok){const e=await a.text();throw new Error(`Gemini API Error: ${a.status} - ${e}`)}const o=(await a.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!o)throw new Error("No content in Gemini response");return JSON.parse(o)}async function p(n,t,s,d){const l=await c();if(!l)throw new Error("User not authenticated for AI feedback");const r="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",u=`
Act as a Canadian Registered Dietitian. Provide evidence-based nutrition advice strictly aligned with the 2019 Canada Food Guide and Health Canada’s Dietary Guidelines.

Core Constraints:

Proportions Over Portions: Prioritize the 'Plate Model' (1/2 vegetables/fruits, 1/4 whole grains, 1/4 protein).

Regional Accuracy: Reference Canadian protein sources (e.g., pulses, lean game, North Atlantic fish) and local seasonal produce.

Metrics: Use Metric units (grams, milliliters) and % Daily Value based on Canadian labeling laws (e.g., 2,300mg sodium limit).

Tone: Professional, encouraging, and mindful of Canada's diverse food environment.

Task: Review the daily log and provide at least one thing to focus on and one piece of positive feedback.

CONTEXT DATA:
1. LAST 14 DAYS FOOD LOGS:
${JSON.stringify(n.map(e=>{const i={};return t.fiberGoal.enabled&&e.details?.fiber!==void 0&&(i.fiber=e.details.fiber),t.sodiumGoal.enabled&&e.details?.sodium!==void 0&&(i.sodium=e.details.sodium),t.sugarLimit.enabled&&e.details?.sugar!==void 0&&(i.sugar=e.details.sugar),t.addedSugarLimit.enabled&&e.details?.addedSugar!==void 0&&(i.addedSugar=e.details.addedSugar),t.satFatLimit.enabled&&e.details?.saturatedFat!==void 0&&(i.saturatedFat=e.details.saturatedFat),t.transFatLimit.enabled&&e.details?.transFat!==void 0&&(i.transFat=e.details.transFat),t.cholesterolLimit.enabled&&e.details?.cholesterol!==void 0&&(i.cholesterol=e.details.cholesterol),{date:e.date,time:e.time,description:e.description,calories:e.calories,protein:e.protein,carbs:e.carbs,fat:e.fat,details:i}}))}

2. USER SETTINGS SUMMARY:
${s}

3. 14-DAY EMA TRENDS:
${d}

Please provide your response in HTML format (using basic tags like <p>, <ul>, <li>, <strong>, <h4>). Do not include <html> or <body> tags.
`,a=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({contents:[{parts:[{text:u}]}]})});if(!a.ok){const e=await a.text();throw new Error(`Gemini API Error: ${a.status} - ${e}`)}const o=(await a.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!o)throw new Error("No content in Gemini response");return o}export{h as a,p as g};
