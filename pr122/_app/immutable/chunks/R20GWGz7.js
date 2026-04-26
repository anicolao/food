import{e as u}from"./BnSn9efL.js";const m=`
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
`;async function f(a,o,s){const n=await u();if(!n)throw new Error("User not authenticated for Gemini analysis");const d="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";let i=m;a.text&&(i+=`

USER TEXT DESCRIPTION: "${a.text}"
`),o&&s&&(i+=`
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${o}".
        The user has provided this correction: "${s}".
        Please re-evaluate the nutrition facts based on this correction.
        `);const t=[{text:i}];a.images&&a.images.forEach(l=>{t.push({inlineData:{mimeType:l.mimeType,data:l.base64}})});const r=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({contents:[{parts:t}],generationConfig:{responseMimeType:"application/json"}})});if(!r.ok){const l=await r.text();throw new Error(`Gemini API Error: ${r.status} - ${l}`)}const e=(await r.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!e)throw new Error("No content in Gemini response");return JSON.parse(e)}async function p(a,o,s){const n=await u();if(!n)throw new Error("User not authenticated for AI feedback");const d="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",i=`
Act as a Canadian Registered Dietitian. Provide evidence-based nutrition advice strictly aligned with the 2019 Canada Food Guide and Health Canada’s Dietary Guidelines.

Core Constraints:

Proportions Over Portions: Prioritize the 'Plate Model' (1/2 vegetables/fruits, 1/4 whole grains, 1/4 protein).

Regional Accuracy: Reference Canadian protein sources (e.g., pulses, lean game, North Atlantic fish) and local seasonal produce.

Metrics: Use Metric units (grams, milliliters) and % Daily Value based on Canadian labeling laws (e.g., 2,300mg sodium limit).

Tone: Professional, encouraging, and mindful of Canada's diverse food environment.

Task: Review the daily log and provide at least one thing to focus on and one piece of positive feedback.

CONTEXT DATA:
1. LAST 14 DAYS FOOD LOGS:
${JSON.stringify(a.map(e=>({date:e.date,time:e.time,description:e.description,calories:e.calories,protein:e.protein,carbs:e.carbs,fat:e.fat})))}

2. USER SETTINGS SUMMARY:
${o}

3. 14-DAY EMA TRENDS:
${s}

Please provide your response in HTML format (using basic tags like <p>, <ul>, <li>, <strong>, <h4>). Do not include <html> or <body> tags.
`,t=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({contents:[{parts:[{text:i}]}]})});if(!t.ok){const e=await t.text();throw new Error(`Gemini API Error: ${t.status} - ${e}`)}const c=(await t.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!c)throw new Error("No content in Gemini response");return c}export{f as a,p as g};
