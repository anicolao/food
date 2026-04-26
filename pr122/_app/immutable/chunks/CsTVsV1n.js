import{e as f}from"./Dvl3rEOg.js";let m=null;async function h(r){if(m)return m;try{const s=await fetch("https://generativelanguage.googleapis.com/v1beta/models",{headers:{Authorization:`Bearer ${r}`}});if(!s.ok)return console.warn("Failed to fetch Gemini models, falling back to default",s.status),"gemini-1.5-flash-latest";const i=await s.json();if(!i.models||!Array.isArray(i.models))return console.warn("Invalid Gemini models response",i),"gemini-1.5-flash-latest";const d=i.models.filter(a=>a.name&&a.name.includes("flash")&&a.supportedGenerationMethods&&a.supportedGenerationMethods.includes("generateContent")).map(a=>a.name.replace("models/","")).sort((a,n)=>a.endsWith("-latest")&&!n.endsWith("-latest")?-1:!a.endsWith("-latest")&&n.endsWith("-latest")?1:n.localeCompare(a));if(d.length>0)return m=d[0],m}catch(t){console.warn("Error fetching Gemini models",t)}return"gemini-1.5-flash-latest"}const p=`
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
`;async function v(r,t,s){const i=await f();if(!i)throw new Error("User not authenticated for Gemini analysis");const a=`https://generativelanguage.googleapis.com/v1beta/models/${await h(i)}:generateContent`;let n=p;r.text&&(n+=`

USER TEXT DESCRIPTION: "${r.text}"
`),t&&s&&(n+=`
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${t}".
        The user has provided this correction: "${s}".
        Please re-evaluate the nutrition facts based on this correction.
        `);const c=[{text:n}];r.images&&r.images.forEach(e=>{c.push({inlineData:{mimeType:e.mimeType,data:e.base64}})});const o=await fetch(a,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({contents:[{parts:c}],generationConfig:{responseMimeType:"application/json"}})});if(!o.ok){const e=await o.text();throw new Error(`Gemini API Error: ${o.status} - ${e}`)}const u=(await o.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!u)throw new Error("No content in Gemini response");return JSON.parse(u)}async function y(r,t,s,i){const d=await f();if(!d)throw new Error("User not authenticated for AI feedback");const n=`https://generativelanguage.googleapis.com/v1beta/models/${await h(d)}:generateContent`,c=`
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

CONTEXT DATA:
1. LAST 14 DAYS FOOD LOGS:
${JSON.stringify(r.map(e=>{const l={};return t.fiberGoal.enabled&&e.details?.fiber!==void 0&&(l.fiber=e.details.fiber),t.sodiumGoal.enabled&&e.details?.sodium!==void 0&&(l.sodium=e.details.sodium),t.sugarLimit.enabled&&e.details?.sugar!==void 0&&(l.sugar=e.details.sugar),t.addedSugarLimit.enabled&&e.details?.addedSugar!==void 0&&(l.addedSugar=e.details.addedSugar),t.satFatLimit.enabled&&e.details?.saturatedFat!==void 0&&(l.saturatedFat=e.details.saturatedFat),t.transFatLimit.enabled&&e.details?.transFat!==void 0&&(l.transFat=e.details.transFat),t.cholesterolLimit.enabled&&e.details?.cholesterol!==void 0&&(l.cholesterol=e.details.cholesterol),{date:e.date,time:e.time,description:e.description,calories:e.calories,protein:e.protein,carbs:e.carbs,fat:e.fat,details:l}}))}

2. USER SETTINGS SUMMARY:
${s}

3. 14-DAY EMA TRENDS:
${i}

Please provide your response in HTML format (using basic tags like <p>, <ul>, <li>, <strong>, <h4>). Do not include <html> or <body> tags.
`,o=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${d}`},body:JSON.stringify({contents:[{parts:[{text:c}]}]})});if(!o.ok){const e=await o.text();throw new Error(`Gemini API Error: ${o.status} - ${e}`)}const u=(await o.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!u)throw new Error("No content in Gemini response");return u}export{v as a,y as g};
