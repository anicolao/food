import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const appleSvg = `
<svg width="300" height="350" viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg">
    <!-- Case -->
    <rect x="10" y="10" width="280" height="330" rx="60" fill="#000" stroke="#333" stroke-width="4"/>
    <!-- Screen -->
    <rect x="25" y="25" width="250" height="300" rx="45" fill="#121212"/>
    
    <!-- Rings (Top Left) -->
    <circle cx="70" cy="80" r="30" fill="none" stroke="#222" stroke-width="8"/>
    <path d="M 70 50 A 30 30 0 1 1 48.8 101.2" fill="none" stroke="url(#appleCalGrad)" stroke-width="8" stroke-linecap="round"/>
    
    <circle cx="70" cy="80" r="20" fill="none" stroke="#222" stroke-width="8"/>
    <path d="M 70 60 A 20 20 0 1 1 55.8 94.2" fill="none" stroke="url(#appleProtGrad)" stroke-width="8" stroke-linecap="round"/>

    <!-- Text Info -->
    <text x="120" y="75" font-family="sans-serif" font-weight="bold" font-size="24" fill="#fff">1,840</text>
    <text x="120" y="95" font-family="sans-serif" font-size="14" fill="#a0a0a0">CALORIES</text>

    <!-- Mic Button -->
    <circle cx="150" cy="220" r="50" fill="#1c1e24" stroke="#333" stroke-width="2"/>
    <!-- Simplified Mic icon -->
    <rect x="142" y="205" width="16" height="25" rx="8" fill="#FF5E62" />
    <path d="M 135 218 A 15 15 0 0 0 165 218" fill="none" stroke="#FF5E62" stroke-width="3" stroke-linecap="round"/>
    <line x1="150" y1="233" x2="150" y2="240" stroke="#FF5E62" stroke-width="3"/>

    <text x="150" y="295" font-family="sans-serif" font-weight="bold" font-size="16" fill="#fff" text-anchor="middle">TAP TO LOG</text>

    <defs>
      <linearGradient id="appleCalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF9966" />
        <stop offset="100%" style="stop-color:#FF5E62" />
      </linearGradient>
      <linearGradient id="appleProtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#c471ed" />
        <stop offset="100%" style="stop-color:#f64f59" />
      </linearGradient>
    </defs>
  </svg>
`;

const androidSvg = `
<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <!-- Case -->
    <circle cx="150" cy="150" r="145" fill="#000" stroke="#333" stroke-width="4"/>
    <!-- Screen -->
    <circle cx="150" cy="150" r="135" fill="#121212"/>

    <!-- Main Ring -->
    <circle cx="150" cy="150" r="110" fill="none" stroke="#1c1e24" stroke-width="12"/>
    <path d="M 150 40 A 110 110 0 1 1 72.1 227.9" fill="none" stroke="url(#wearCalGrad)" stroke-width="12" stroke-linecap="round"/>

    <!-- Inner Content -->
    <text x="150" y="130" font-family="sans-serif" font-weight="bold" font-size="36" fill="#fff" text-anchor="middle">1,840</text>
    <text x="150" y="155" font-family="sans-serif" font-size="16" fill="#a0a0a0" text-anchor="middle">CALORIES LEFT</text>

    <!-- Macro Progress Mini -->
    <rect x="90" y="180" width="120" height="8" rx="4" fill="#1c1e24"/>
    <rect x="90" y="180" width="80" height="8" rx="4" fill="url(#wearProtGrad)"/>
    <text x="150" y="205" font-family="sans-serif" font-size="12" fill="#a0a0a0" text-anchor="middle">PROTEIN: 85/120g</text>

    <!-- Quick Add FAB -->
    <circle cx="150" cy="245" r="25" fill="#FF5E62"/>
    <path d="M 150 235 v 20 M 140 245 h 20" stroke="#fff" stroke-width="4" stroke-linecap="round"/>

    <defs>
      <linearGradient id="wearCalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF9966" />
        <stop offset="100%" style="stop-color:#FF5E62" />
      </linearGradient>
      <linearGradient id="wearProtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#c471ed" />
        <stop offset="100%" style="stop-color:#f64f59" />
      </linearGradient>
    </defs>
  </svg>
`;

async function render(svg, outputPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body style="margin:0;padding:0;background:transparent;">' + svg + '</body></html>');
  const element = await page.$('svg');
  await element.screenshot({ path: outputPath, omitBackground: true });
  await browser.close();
  console.log('Rendered ' + outputPath);
}

(async () => {
  const outputDir = path.join(process.cwd(), 'design/mockups');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await render(appleSvg, path.join(outputDir, 'wearables_apple.png'));
  await render(androidSvg, path.join(outputDir, 'wearables_android.png'));
})();
