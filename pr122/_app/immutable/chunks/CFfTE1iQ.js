import{e as p,s as v}from"./Dlq2nVFx.js";import{t as g}from"./tof6tSaJ.js";let u=null;async function w(n){const i=await fetch("https://generativelanguage.googleapis.com/v1beta/models",{headers:{Authorization:`Bearer ${n}`}});if(!i.ok)throw new Error(`Failed to fetch Gemini models: ${i.status}`);return(await i.json()).models||[]}async function b(n){const a=v.getState().config.geminiModel;if(a)return u!==a&&(g.info(`Using AI model: ${a}`),u=a),a;if(u)return u;try{const o=(await w(n)).filter(t=>t.name&&t.name.includes("flash")&&t.supportedGenerationMethods&&t.supportedGenerationMethods.includes("generateContent")).map(t=>t.name.replace("models/","")).sort((t,r)=>t.endsWith("-latest")&&!r.endsWith("-latest")?-1:!t.endsWith("-latest")&&r.endsWith("-latest")?1:r.localeCompare(t));if(o.length>0){const t=o[0];return u!==t&&(g.info(`Using AI model: ${t}`),u=t),t}}catch(i){throw console.warn("Error fetching Gemini models",i),i}throw new Error("No valid Gemini Flash models found")}const y=`
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
`;async function E(n,a,i){const o=await p();if(!o)throw new Error("User not authenticated for Gemini analysis");const r=`https://generativelanguage.googleapis.com/v1beta/models/${await b(o)}:generateContent`;let m=y;n.text&&(m+=`

USER TEXT DESCRIPTION: "${n.text}"
`),a&&i&&(m+=`
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${a}".
        The user has provided this correction: "${i}".
        Please re-evaluate the nutrition facts based on this correction.
        `);const f=[{text:m}];n.images&&n.images.forEach(d=>{f.push({inlineData:{mimeType:d.mimeType,data:d.base64}})});const l=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({contents:[{parts:f}],generationConfig:{responseMimeType:"application/json"}})});if(!l.ok){const d=await l.text();throw new Error(`Gemini API Error: ${l.status} - ${d}`)}const h=(await l.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!h)throw new Error("No content in Gemini response");return JSON.parse(h)}async function T(n,a,i,o,t){const r=await p();if(!r)throw new Error("User not authenticated for AI feedback");const f=`https://generativelanguage.googleapis.com/v1beta/models/${await b(r)}:generateContent`,l=`
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
${JSON.stringify(n.map(e=>{const s={};return a.fiberGoal.enabled&&e.details?.fiber!==void 0&&(s.fiber=e.details.fiber),a.sodiumGoal.enabled&&e.details?.sodium!==void 0&&(s.sodium=e.details.sodium),a.sugarLimit.enabled&&e.details?.sugar!==void 0&&(s.sugar=e.details.sugar),a.addedSugarLimit.enabled&&e.details?.addedSugar!==void 0&&(s.addedSugar=e.details.addedSugar),a.satFatLimit.enabled&&e.details?.saturatedFat!==void 0&&(s.saturatedFat=e.details.saturatedFat),a.transFatLimit.enabled&&e.details?.transFat!==void 0&&(s.transFat=e.details.transFat),a.cholesterolLimit.enabled&&e.details?.cholesterol!==void 0&&(s.cholesterol=e.details.cholesterol),{date:e.date,time:e.time,description:e.description,calories:e.calories,protein:e.protein,carbs:e.carbs,fat:e.fat,details:s}}))}

2. USER SETTINGS SUMMARY:
${i}

3. 14-DAY EMA TRENDS:
${o}

4. RECENT FEEDBACKS:
${JSON.stringify(t)}

Please provide your response in HTML format (using basic tags like <p>, <ul>, <li>, <strong>, <h4>). Do not include <html> or <body> tags.
`,c=await fetch(f,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${r}`},body:JSON.stringify({contents:[{parts:[{text:l}]}]})});if(!c.ok){const e=await c.text();throw new Error(`Gemini API Error: ${c.status} - ${e}`)}const d=(await c.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!d)throw new Error("No content in Gemini response");return d}export{E as a,T as g,w as l};
