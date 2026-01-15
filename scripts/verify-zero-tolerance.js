import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'playwright.config.ts');

if (!fs.existsSync(configPath)) {
    console.error('Error: playwright.config.ts not found');
    process.exit(1);
}

const content = fs.readFileSync(configPath, 'utf-8');

// Robust Regex to check for maxDiffPixels: 0 inside expect.toHaveScreenshot
// Matches: toHaveScreenshot: { ... maxDiffPixels: 0 ... }
// It handles whitespace and potential other properties.
const zeroToleranceRegex = /toHaveScreenshot:\s*\{[^}]*maxDiffPixels:\s*0[^}]*\}/;

// Also check for simple "maxDiffPixels: 0" line if the structure is simple
const strictLineRegex = /maxDiffPixels:\s*0/;

if (!strictLineRegex.test(content)) {
    console.error('❌ ZERO TOLERANCE VIOLATION: playwright.config.ts must have "maxDiffPixels: 0".');
    console.error('Current content seems to lack this setting or has a non-zero value.');
    process.exit(1);
}

// Ensure it's not commented out (simple check)
const lines = content.split('\n');
const settingLine = lines.find(l => l.includes('maxDiffPixels'));
if (settingLine && settingLine.trim().startsWith('//')) {
    console.error('❌ ZERO TOLERANCE VIOLATION: "maxDiffPixels: 0" is commented out.');
    process.exit(1);
}

// Double check against non-zero values
const nonZeroRegex = /maxDiffPixels:\s*[1-9]/;
if (nonZeroRegex.test(content)) {
    console.error('❌ ZERO TOLERANCE VIOLATION: Non-zero maxDiffPixels detected.');
    process.exit(1);
}

console.log('✅ Zero Tolerance Policy Verified: maxDiffPixels is 0.');
