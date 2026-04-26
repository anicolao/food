import{j as h,s as F}from"./DGec0LHv.js";import{t as g}from"./BXWuFe6I.js";function k(o,i){if(o.length===0)return[];const e=2/(i+1),r=[];let t=o[0];r.push(t);for(let n=1;n<o.length;n++)t=o[n]*e+t*(1-e),r.push(t);return r}function p(o,i){const e=[],r=new Date(o);for(let t=i-1;t>=0;t--){const n=new Date(r);n.setDate(n.getDate()-t),e.push(n.toISOString().split("T")[0])}return e}function w(o,i,e,r=30,t=14){const c=p(e,r).map(u=>o[u]?.[i]||0);return k(c,t)}let f=null;async function A(o){const e=await fetch("https://generativelanguage.googleapis.com/v1beta/models",{headers:{Authorization:`Bearer ${o}`}});if(!e.ok)throw new Error(`Failed to fetch Gemini models: ${e.status}`);return(await e.json()).models||[]}async function y(o){const i=F.getState().config.geminiModel;if(i)return f!==i&&(g.info(`Using AI model: ${i}`),f=i),i;if(f)return f;try{const r=(await A(o)).filter(t=>t.name&&t.name.includes("flash")&&t.supportedGenerationMethods&&t.supportedGenerationMethods.includes("generateContent")).map(t=>t.name.replace("models/","")).sort((t,n)=>t.endsWith("-latest")&&!n.endsWith("-latest")?-1:!t.endsWith("-latest")&&n.endsWith("-latest")?1:n.localeCompare(t));if(r.length>0){const t=r[0];return f!==t&&(g.info(`Using AI model: ${t}`),f=t),t}}catch(e){console.warn("Error fetching Gemini models, falling back to gemini-1.5-flash-latest",e)}return"gemini-1.5-flash-latest"}const L=`
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
`;async function C(o,i,e){const r=await h();if(!r)throw new Error("User not authenticated for Gemini analysis");const n=`https://generativelanguage.googleapis.com/v1beta/models/${await y(r)}:generateContent`;let c=L;o.text&&(c+=`

USER TEXT DESCRIPTION: "${o.text}"
`),i&&e&&(c+=`
        
        CONTEXT FOR RE-ANALYSIS:
        The previous analysis provided this rationale: "${i}".
        The user has provided this correction: "${e}".
        Please re-evaluate the nutrition facts based on this correction.
        `);const u=[{text:c}];o.images&&o.images.forEach(d=>{u.push({inlineData:{mimeType:d.mimeType,data:d.base64}})});const s=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${r}`},body:JSON.stringify({contents:[{parts:u}],generationConfig:{responseMimeType:"application/json"}})});if(!s.ok){const d=await s.text();throw new Error(`Gemini API Error: ${s.status} - ${d}`)}const b=(await s.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!b)throw new Error("No content in Gemini response");return JSON.parse(b)}function $(o,i,e,r){const t=o,c=p(t,14),u=i.filter(a=>c.includes(a.date));let s=`Target Calories: ${e.targetCalories} kcal
`;s+=`Macro Ratios: Protein ${e.macroRatios.protein*100}%, Fat ${e.macroRatios.fat*100}%, Carbs ${e.macroRatios.carbs*100}%
`,e.fiberGoal.enabled&&(s+=`Fiber Goal: ${e.fiberGoal.value}g
`),e.sodiumGoal.enabled&&(s+=`Sodium Goal: ${e.sodiumGoal.value}mg
`),e.sugarLimit.enabled&&(s+=`Sugar Limit: ${e.sugarLimit.value}g/1000kcal
`),e.addedSugarLimit.enabled&&(s+=`Added Sugar Limit: ${e.addedSugarLimit.value}g/1000kcal
`),e.satFatLimit.enabled&&(s+=`Saturated Fat Limit: ${e.satFatLimit.value}g/1000kcal
`),e.transFatLimit.enabled&&(s+=`Trans Fat Limit: ${e.transFatLimit.value}g/1000kcal
`),e.cholesterolLimit.enabled&&(s+=`Cholesterol Limit: ${e.cholesterolLimit.value}mg/1000kcal
`);const m=[{key:"totalCalories",label:"Calories"},{key:"totalProtein",label:"Protein"},{key:"totalCarbs",label:"Carbs"},{key:"totalFat",label:"Fat"},{key:"totalFiber",label:"Fiber",enabled:e.fiberGoal.enabled},{key:"totalSodium",label:"Sodium",enabled:e.sodiumGoal.enabled},{key:"totalSugar",label:"Sugar",enabled:e.sugarLimit.enabled},{key:"totalAddedSugar",label:"Added Sugar",enabled:e.addedSugarLimit.enabled},{key:"totalSaturatedFat",label:"Saturated Fat",enabled:e.satFatLimit.enabled},{key:"totalTransFat",label:"Trans Fat",enabled:e.transFatLimit.enabled},{key:"totalCholesterol",label:"Cholesterol",enabled:e.cholesterolLimit.enabled}],b=Object.entries(r).filter(([a,l])=>l.aiFeedback&&a<o).sort(([a],[l])=>l.localeCompare(a)).slice(0,2).map(([a,l])=>({date:a,feedback:l.aiFeedback}));let d="";return m.forEach(a=>{if(a.enabled!==!1){const S=w(r,a.key,t,28,14).slice(-14);d+=`${a.label} 14-day EMA (last 14 days): ${S.map(v=>v.toFixed(1)).join(", ")}
`}}),{last14DaysLogs:u,settingsSummary:s,emaSummary:d,recentFeedbacks:b}}async function G(o,i,e,r,t){const n=await h();if(!n)throw new Error("User not authenticated for AI feedback");const u=`https://generativelanguage.googleapis.com/v1beta/models/${await y(n)}:generateContent`,s=`
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
${JSON.stringify(o.map(a=>{const l={};return i.fiberGoal.enabled&&a.details?.fiber!==void 0&&(l.fiber=a.details.fiber),i.sodiumGoal.enabled&&a.details?.sodium!==void 0&&(l.sodium=a.details.sodium),i.sugarLimit.enabled&&a.details?.sugar!==void 0&&(l.sugar=a.details.sugar),i.addedSugarLimit.enabled&&a.details?.addedSugar!==void 0&&(l.addedSugar=a.details.addedSugar),i.satFatLimit.enabled&&a.details?.saturatedFat!==void 0&&(l.saturatedFat=a.details.saturatedFat),i.transFatLimit.enabled&&a.details?.transFat!==void 0&&(l.transFat=a.details.transFat),i.cholesterolLimit.enabled&&a.details?.cholesterol!==void 0&&(l.cholesterol=a.details.cholesterol),{date:a.date,time:a.time,description:a.description,calories:a.calories,protein:a.protein,carbs:a.carbs,fat:a.fat,details:l}}))}

2. USER SETTINGS SUMMARY:
${e}

3. 14-DAY EMA TRENDS:
${r}

4. RECENT FEEDBACKS:
${JSON.stringify(t)}

Please provide your response in HTML format (using basic tags like <p>, <ul>, <li>, <strong>, <h4>). Do not include <html> or <body> tags.
`,m=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({contents:[{parts:[{text:s}]}]})});if(!m.ok){const a=await m.text();throw new Error(`Gemini API Error: ${m.status} - ${a}`)}const d=(await m.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!d)throw new Error("No content in Gemini response");return d}export{C as a,w as b,G as g,A as l,$ as p};
