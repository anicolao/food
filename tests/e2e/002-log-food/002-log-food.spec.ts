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

    // Block real Google Identity script to prevent overwriting mocks
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

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
                await route.fulfill({ json: { id: 'file-123', webViewLink: 'https://drive.mock/img.jpg', thumbnailLink: 'https://drive.mock/thumb.jpg' } });
            } else {
                // Creation Fallback (if search returned empty, but here we return found)
                await route.fulfill({ json: { id: 'new-mock-id' } });
            }
        } else if (url.includes('photospicker.googleapis.com')) {
            if (url.includes('sessions') && !url.includes('mediaItems')) {
                if (route.request().method() === 'POST') {
                    // Create Session
                    await route.fulfill({ json: { id: 'sess-1', pickerUri: 'http://mock-picker.com' } });
                } else {
                    // Poll Session
                    // First poll -> not done. Second -> Done.
                    // Mock simple 'done' for speed.
                    await route.fulfill({ json: { mediaItemsSet: true } });
                }
            } else if (url.includes('mediaItems')) {
                // List Items with googleusercontent style URL
                await route.fulfill({ json: { mediaItems: [{ id: 'item-1', mediaFile: { baseUrl: 'https://lh3.googleusercontent.com/picker-img', mimeType: 'image/jpeg', filename: 'picked.jpg' } }] } });
            }
        } else if (url.includes('lh3.googleusercontent.com')) {
            // Mock image download (ignoring query params like =w2048)
            const buffer = fs.readFileSync('tests/e2e/fixtures/apple.png');
            await route.fulfill({ body: buffer, contentType: 'image/png' });
        } else if (url.includes('picker.jpg')) {
            const buffer = fs.readFileSync('tests/e2e/fixtures/apple.png');
            await route.fulfill({ body: buffer, contentType: 'image/png' });
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
            { spec: 'Upload button visible', check: async () => await expect(page.getByText('Pick Photos')).toBeVisible() }
        ]
    });

    // Upload File
    const fileInput = page.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles('tests/e2e/fixtures/apple.png');

    await tester.step('preview', {
        description: 'Image preview shown',
        verifications: [
            { spec: 'Preview visible', check: async () => await expect(page.locator('.preview-thumb')).toBeVisible() },
            { spec: 'Status is Analyzing', check: async () => await expect(page.getByText('Analyzing 1 images with Gemini...')).toBeVisible() }
        ]
    });

    // Wait for Gemini Mock
    await expect(page.getByLabel('Item Name')).toHaveValue('Mock Apple');

    await tester.step('analysis', {
        description: 'AI Analysis Received',
        verifications: [
            { spec: 'Calories populated', check: async () => await expect(page.getByLabel('Calories')).toHaveValue('95') }
        ]
    });

    // Verify default value (Time might dictate Breakfast/Lunch based on file mod time)
    // We force set to Lunch to ensure downstream assertions pass deterministically
    // We ALSO force set the Date to match our mocked "Today" (2024-03-15) because the image EXIF might change it.
    await page.getByLabel('Date').fill('2024-03-15');
    await page.getByLabel('Meal Type').selectOption('Lunch');
    await expect(page.getByLabel('Meal Type')).toHaveValue('Lunch');

    // Edit to 100
    await page.getByLabel('Calories').fill('100');

    await tester.step('edited', {
        description: 'User corrects analysis',
        verifications: [
            { spec: 'Calories updated to 100', check: async () => await expect(page.getByLabel('Calories')).toHaveValue('100') },
            { spec: 'Meal type is Lunch', check: async () => await expect(page.getByLabel('Meal Type')).toHaveValue('Lunch') }
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
            // Check Gallery opening
            {
                spec: 'Gallery opens on click', check: async () => {
                    await page.locator('.thumb-btn').click();
                    await expect(page.locator('.modal-content')).toBeVisible();
                    await page.locator('.close-btn').click();
                    await expect(page.locator('.modal-content')).not.toBeVisible();
                }
            }
        ]
    });

    tester.generateDocs();
});
