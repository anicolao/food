import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test('US-003: User logs food', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Logging', 'User logs a meal.');
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    // Mock Auth & Services
    await page.addInitScript(() => {
        (window as any).google = { accounts: { oauth2: { initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }) } } };
    });

    // Debug requests
    await page.route('**', async route => {
        console.log('REQUEST:', route.request().url());
        await route.continue();
    });

    // Stateful Mock for Sheets
    const events: any[] = [];

    await page.route('**googleapis.com**', async route => {
        const url = route.request().url();
        console.log('MOCKING:', url);

        if (url.includes('upload/drive')) {
            await route.fulfill({ json: { id: 'file-123', webViewLink: 'http://mock-drive/img.jpg' } });
        } else if (url.includes('sheets.googleapis.com')) {
            if (url.includes('append')) {
                // Capture append
                const postData = route.request().postDataJSON();
                if (postData && postData.values && postData.values[0]) {
                    events.push(postData.values[0]);
                }
                await route.fulfill({ json: { updates: { updatedRange: 'A1' } } });
            } else if (url.includes('values/Events')) {
                // Return events
                await route.fulfill({ json: { values: events } });
            } else {
                await route.fulfill({ json: {} });
            }
        } else if (url.includes('generativelanguage')) {
            // Simulate network/processing delay
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({
                json: {
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    is_label: true,
                                    item_name: 'Mock Apple',
                                    calories: 95,
                                    fat: { total: 0 },
                                    carbohydrates: { total: 25 },
                                    protein: 0
                                })
                            }]
                        }
                    }]
                }
            });
        } else {
            await route.continue();
        }
    });

    await page.goto('/');
    await page.getByText('Sign In with Google').click();
    await page.getByText('Log Food').click();

    await tester.step('log-page', {
        description: 'User on log page',
        verifications: [{ spec: 'Upload button visible', check: async () => await expect(page.getByText('Take Photo')).toBeVisible() }]
    });

    // Upload File
    const fileInput = page.locator('input[type="file"]');
    // Use realistic fixture image
    await fileInput.setInputFiles('tests/e2e/fixtures/apple.png');

    await tester.step('preview', {
        description: 'Image preview shown',
        verifications: [
            { spec: 'Preview visible', check: async () => await expect(page.locator('.preview')).toBeVisible() },
            { spec: 'Status is Analyzing', check: async () => await expect(page.getByText('Analyzing with Gemini...')).toBeVisible() }
        ]
    });

    // Wait for Gemini Mock (triggered by file load)
    await expect(page.getByLabel('Item Name')).toHaveValue('Mock Apple');

    await tester.step('analysis', {
        description: 'AI Analysis Received',
        verifications: [
            { spec: 'Calories populated', check: async () => await expect(page.getByLabel('Calories')).toHaveValue('95') }
        ]
    });

    // Edit
    await page.getByLabel('Calories').fill('100');
    await page.getByText('Save Entry').click();

    await tester.step('saved', {
        description: 'Returned to Dashboard',
        verifications: [
            { spec: 'On Dashboard', check: async () => await expect(page.getByText('Today\'s Summary')).toBeVisible() },
            { spec: 'Calories updated', check: async () => await expect(page.locator('.value').first()).toHaveText('100') },
            { spec: 'History updated', check: async () => await expect(page.getByText('Mock Apple')).toBeVisible() }
        ]
    });

    tester.generateDocs();
});
