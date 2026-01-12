import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import * as fs from 'fs';
import * as path from 'path';

test('US-003 to US-010: User logs food flow', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Logging', 'User logs a meal.');
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    // Mock Auth & Services
    await page.clock.install({ time: new Date('2024-03-15T12:00:00') });
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

    // Mock Drive Images
    await page.route(/drive\.mock/, async route => {
        const buffer = fs.readFileSync('tests/e2e/fixtures/apple.png');
        await route.fulfill({ body: buffer, contentType: 'image/png' });
    });

    await page.route('**googleapis.com**', async route => {
        const url = route.request().url();
        console.log('MOCKING:', url);

        // Drive Discovery Mocks (ensureDataStructures)
        if (url.includes('drive/v3/files')) {
            if (url.includes('foodlog') || url.includes('FoodLog')) {
                // Search for Folder
                await route.fulfill({ json: { files: [{ id: 'mock-folder-id', name: 'FoodLog' }] } });
            } else if (url.includes('Events')) {
                // Search for File
                await route.fulfill({ json: { files: [{ id: 'mock-spreadsheet-id', name: 'Events' }] } });
            } else if (url.includes('uploadType=multipart')) {
                // Upload
                await route.fulfill({ json: { id: 'file-123', webViewLink: 'https://drive.mock/img.jpg' } });
            } else {
                // Creation Fallback (if search returned empty, but here we return found)
                await route.fulfill({ json: { id: 'new-mock-id' } });
            }
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
        verifications: [
            { spec: 'Camera button visible', check: async () => await expect(page.getByText('Take Photo')).toBeVisible() },
            { spec: 'Upload button visible', check: async () => await expect(page.getByText('Upload File')).toBeVisible() }
        ]
    });

    // Upload File (using the upload button input)
    // In our implementation, the 'Upload File' button triggers the second input (fileInput)
    // We can target the input directly or trigger the click. For Playwright, setInputFiles on the visible input is hard because it's hidden.
    // We target the input that does NOT have capture="environment"
    const fileInput = page.locator('input[type="file"]:not([capture])');
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

    // Verify default value
    await expect(page.getByLabel('Calories')).toHaveValue('95');
    // Verify Smart Meal Type Default (Time is 12:00 -> Lunch)
    await expect(page.getByLabel('Meal Type')).toHaveValue('Lunch');

    // Edit to 100
    await page.getByLabel('Calories').fill('100');

    await tester.step('edited', {
        description: 'User corrects analysis',
        verifications: [
            { spec: 'Calories updated to 100', check: async () => await expect(page.getByLabel('Calories')).toHaveValue('100') },
            { spec: 'Meal type defaulted to Lunch', check: async () => await expect(page.getByLabel('Meal Type')).toHaveValue('Lunch') }
        ]
    });

    // Save
    await page.getByText('Save Entry').click();

    await tester.step('saved', {
        description: 'Returned to Dashboard',
        verifications: [
            { spec: 'On Dashboard', check: async () => await expect(page.getByText('Today\'s Summary')).toBeVisible() },
            { spec: 'Calories updated', check: async () => await expect(page.locator('.value').first()).toHaveText('100') },
            { spec: 'History name shown', check: async () => await expect(page.getByText('Mock Apple')).toBeVisible() },
            { spec: 'Meal type shown', check: async () => await expect(page.getByText('Lunch')).toBeVisible() },
            { spec: 'Thumbnail shown', check: async () => await expect(page.locator('.thumb')).toBeVisible() },
            { spec: 'Thumbnail linked to Drive', check: async () => await expect(page.locator('a:has(.thumb)')).toHaveAttribute('href', 'https://drive.mock/img.jpg') },
            // Wait for image to load to ensure valid src
            {
                spec: 'Thumbnail loaded',
                check: async () => {
                    const img = page.locator('.thumb');
                    await expect(img).toBeVisible();
                    await expect(img).toHaveAttribute('src', 'https://drive.mock/img.jpg');
                    // Ensure it is not broken
                    const naturalWidth = await img.evaluate((e: HTMLImageElement) => e.naturalWidth);
                    expect(naturalWidth).toBeGreaterThan(0);
                }
            }
        ]
    });

    tester.generateDocs();
});
