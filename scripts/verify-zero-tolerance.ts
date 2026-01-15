import config from '../playwright.config';

console.log('Verifying Zero Tolerance Policy in playwright.config.ts...');

const maxDiffPixels = config.expect?.toHaveScreenshot?.maxDiffPixels;

if (maxDiffPixels !== 0) {
    console.error(`❌ ZERO TOLERANCE VIOLATION: maxDiffPixels is set to ${maxDiffPixels}. It must be 0.`);
    process.exit(1);
}

console.log('✅ Zero Tolerance Policy Verified: maxDiffPixels is 0.');
