import { test, expect } from './fixtures';
import { mockDriveAPI } from './helpers/mock-drive';

test.describe('Issue #121: AI Nutritionist Feedback', () => {
  let lastPrompt: any = null;

  test.beforeEach(async ({ page }) => {
    await page.route('**/v1beta/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [
            {
              name: 'models/gemini-1.5-flash-001',
              supportedGenerationMethods: ['generateContent']
            },
            {
              name: 'models/gemini-1.5-flash-002',
              supportedGenerationMethods: ['generateContent']
            },
            {
              name: 'models/gemini-1.5-flash-latest',
              supportedGenerationMethods: ['generateContent']
            }
          ]
        })
      });
    });

    await page.route('**/v1beta/models/*:generateContent*', async (route) => {
      lastPrompt = route.request().postDataJSON();
      // Delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              candidates: [{
                  content: {
                      parts: [{
                          text: '<h4>Positive Feedback</h4><p>You are doing great!</p><h4>Focus Area</h4><p>Try more greens.</p>'
                      }]
                  }
              }]
          })
      });
    });

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

    await page.route('https://accounts.google.com/gsi/client', route => route.abort());
    await mockDriveAPI(page);
  });

  test('AI Nutritionist section displays and triggers feedback', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any)._authReady);
    await page.click('button:has-text("Sign In with Google")');
    
    const card = page.locator('.ai-analysis-card');
    await expect(card).toBeVisible();
    
    const feedbackBtn = card.locator('button:has-text("Get AI Feedback")');
    await feedbackBtn.click();
    
    await expect(card.locator('.ai-loading')).toBeVisible();
    
    const content = card.locator('.ai-content');
    await expect(content).toBeVisible();
    await expect(content.locator('h4').first()).toContainText('Positive Feedback');
    
    expect(lastPrompt).toBeDefined();
    const promptText = lastPrompt.contents[0].parts[0].text;
    expect(promptText).toContain('Act as a Canadian Registered Dietitian');
    expect(promptText).toContain('LAST 14 DAYS FOOD LOGS');
    expect(promptText).toContain('USER SETTINGS SUMMARY');
    expect(promptText).toContain('14-DAY EMA TRENDS');
    expect(promptText).toContain('Calories 14-day EMA (last 14 days)');
  });

  test('AI Nutritionist appears in sharing view with folderId', async ({ page }) => {
    // Navigate to home and sign in first to ensure we have auth if public discovery fails
    await page.goto('/');
    await page.waitForFunction(() => (window as any)._authReady);
    await page.click('button:has-text("Sign In with Google")');

    // Navigate to sharing view
    await page.goto('/sharing?folderId=mock-folder-id');
    
    // Wait for page to be ready
    await expect(page.locator('[data-testid="sharing-page"]')).toBeVisible();
    
    // Check for AI nutritionist card
    const card = page.locator('[data-testid="ai-nutritionist-card"]');
    await expect(card).toBeVisible();
    
    // Trigger feedback in sharing view
    const feedbackBtn = card.locator('button:has-text("Get AI Feedback")');
    await feedbackBtn.click();
    
    await expect(card.locator('.ai-loading')).toBeVisible();
    
    const content = card.locator('.ai-content');
    await expect(content).toBeVisible();
    await expect(content.locator('h4').first()).toContainText('Positive Feedback');
    
    // Verify HealthSummary is visible
    await expect(page.locator('.health-summary-wrapper')).toBeVisible();
  });
});
