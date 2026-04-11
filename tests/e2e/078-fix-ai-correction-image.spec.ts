
import { test, expect } from './fixtures';
import { mockDriveAPI } from './helpers/mock-drive';

test.describe('Issue #78: AI Correction Image Bug', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Gemini requests
    await page.route('**/v1beta/models/gemini-*:generateContent*', async (route) => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              candidates: [{
                  content: {
                      parts: [{
                          text: JSON.stringify({
                              item_name: 'Mock Food',
                              calories: 100,
                              protein: 10,
                              fat: { total: 5 },
                              carbohydrates: { total: 10 },
                              rationale: 'Mock rationale',
                              searchQuery: 'Chocolate Swiss roll'
                          })
                      }]
                  }
              }]
          })
      });
    });

    // Mock Google Auth
    await page.addInitScript(() => {
      (window as any).google = {
          accounts: {
              oauth2: {
                  initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock-token' }) }),
                  revoke: (token: string, cb: any) => cb()
              }
          }
      };
    });

    // Block real Google Identity script
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());
    
    // Use generic Drive/Sheets mocks
    await mockDriveAPI(page);

    // Mock image search
    await page.route('**/search-image*', async (route) => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ imageUrl: 'https://example.com/food.jpg' })
      });
    });

    // Mock the image fetch
    await page.route('https://example.com/food.jpg', async (route) => {
      await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('fake-representative-image')
      });
    });
  });

  async function login(page: any) {
    await page.goto('/');
    await page.waitForFunction(() => (window as any)._authReady);
    await page.click('button:has-text("Sign In with Google")');
    await page.goto('/log');
  }

  test('representative images are NOT sent in correction requests', async ({ page }) => {
    await login(page);
    
    // 1. Trigger text analysis to get a representative image
    await page.click('button:has-text("Text")');
    await page.fill('textarea', 'Chocolate Swiss roll');
    await page.click('button:has-text("Analyze")');
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    // 2. Intercept re-analysis
    let reanalysisData: any = null;
    await page.route('**/v1beta/models/gemini-*:generateContent*', async (route) => {
      reanalysisData = route.request().postDataJSON();
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              candidates: [{
                  content: {
                      parts: [{
                          text: JSON.stringify({
                              item_name: 'Corrected Food',
                              calories: 50,
                              protein: 5,
                              fat: { total: 2 },
                              carbohydrates: { total: 5 },
                              rationale: 'Corrected'
                          })
                      }]
                  }
              }]
          })
      });
    });

    // 3. Correct AI
    await page.click('button:has-text("Correct AI")');
    await page.fill('textarea[placeholder*="e.g."]', 'Actually it was half');
    await page.click('button:has-text("Retry")');
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    expect(reanalysisData).toBeDefined();
    const hasImage = reanalysisData.contents[0].parts.some((p: any) => p.inlineData);
    expect(hasImage).toBe(false);
  });

  test('real images ARE still sent in correction requests', async ({ page }) => {
    await login(page);
    
    // 1. Attach a REAL image
    const buffer = Buffer.from('fake-real-image');
    await page.setInputFiles('input[type="file"]', {
      name: 'real-food.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer
    });
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    // 2. Intercept re-analysis
    let reanalysisData: any = null;
    await page.route('**/v1beta/models/gemini-*:generateContent*', async (route) => {
      reanalysisData = route.request().postDataJSON();
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              candidates: [{
                  content: {
                      parts: [{
                          text: JSON.stringify({
                              item_name: 'Corrected Food',
                              calories: 50,
                              protein: 5,
                              fat: { total: 2 },
                              carbohydrates: { total: 5 },
                              rationale: 'Corrected'
                          })
                      }]
                  }
              }]
          })
      });
    });

    // 3. Correct AI
    await page.click('button:has-text("Correct AI")');
    await page.fill('textarea[placeholder*="e.g."]', 'It was 2 eggs');
    await page.click('button:has-text("Retry")');
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    expect(reanalysisData).toBeDefined();
    const hasImage = reanalysisData.contents[0].parts.some((p: any) => p.inlineData);
    expect(hasImage).toBe(true);
  });

  test('mixed media: only real images are sent in correction requests', async ({ page }) => {
    await login(page);
    
    // 1. Get representative image
    await page.click('button:has-text("Text")');
    await page.fill('textarea', 'Chocolate Swiss roll');
    await page.click('button:has-text("Analyze")');
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    // 2. Attach a REAL image
    const buffer = Buffer.from('fake-real-image');
    await page.setInputFiles('input[type="file"]', {
      name: 'real-food.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer
    });
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    // 3. Intercept re-analysis
    let reanalysisData: any = null;
    await page.route('**/v1beta/models/gemini-*:generateContent*', async (route) => {
      reanalysisData = route.request().postDataJSON();
      await route.continue();
    });

    // 4. Correct AI
    await page.click('button:has-text("Correct AI")');
    await page.fill('textarea[placeholder*="e.g."]', 'Correcting');
    await page.click('button:has-text("Retry")');
    await page.waitForSelector('.analyzing-state', { state: 'hidden' });

    expect(reanalysisData).toBeDefined();
    const images = reanalysisData.contents[0].parts.filter((p: any) => p.inlineData);
    expect(images.length).toBe(1);
    expect(images[0].inlineData.data).toBe(buffer.toString('base64'));
  });
});
