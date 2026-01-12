import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import * as fs from 'fs';
import * as path from 'path';

test('US-013 to US-017: Smart Date Formatting', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Smart Dates', 'Verifying date formatting rules.');

    // Mock Services (Copied from 002-log-food)
    // Fixed Time: Friday, March 15, 2024 at 12:00:00
    await page.clock.install({ time: new Date('2024-03-15T12:00:00') });

    await page.addInitScript(() => {
        (window as any).google = {
            accounts: { oauth2: { initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }) } }
        };
    });

    // Block real GSI
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

    // Mock Drive/Photos/Sheets/Gemini
    await page.route(/drive\.mock/, async route => {
        const buffer = fs.readFileSync('tests/e2e/fixtures/apple.png');
        await route.fulfill({ body: buffer, contentType: 'image/png' });
    });

    await page.route('**googleapis.com**', async route => {
        const url = route.request().url();
        if (url.includes('drive/v3/files') || url.includes('photospicker') || url.includes('sheets') || url.includes('generativelanguage')) {
            if (url.includes('generativelanguage')) {
                await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ is_label: false, item_name: 'Test Food', calories: 100, fat: { total: 0 }, carbohydrates: { total: 0 }, protein: 0 }) }] } }] } });
            } else if (url.includes('uploadType=multipart')) {
                await route.fulfill({ json: { id: 'file-123', webViewLink: 'https://drive.mock/img.jpg', thumbnailLink: 'https://drive.mock/thumb.jpg' } });
            } else {
                await route.fulfill({ json: { files: [], values: [] } }); // Generic success
            }
        } else {
            await route.continue();
        }
    });

    await page.goto('/');
    await page.getByText('Sign In with Google').click();

    // Helper to log an item with specific date
    async function logItem(date: string, time: string, name: string) {
        await page.getByText('Log Food').click();
        const fileInput = page.locator('input[type="file"]:not([capture])');
        await fileInput.setInputFiles('tests/e2e/fixtures/apple.png');

        await expect(page.getByLabel('Item Name')).toHaveValue('Test Food');

        await page.getByLabel('Item Name').fill(name);
        await page.getByLabel('Date').fill(date);
        await page.getByLabel('Time').fill(time);
        await page.getByText('Save Entry').click();
        await expect(page.getByText('Recent Logs')).toBeVisible();
    }

    // 1. Today (2024-03-15) -> "12:00"
    await logItem('2024-03-15', '12:00', 'Today Food');

    // 2. Yesterday (2024-03-14) -> "Yesterday @ 12:00"
    await logItem('2024-03-14', '12:00', 'Yesterday Food');

    // 3. Last Week (Monday 2024-03-11) -> "Monday @ 12:00"
    // 15th is Friday. 11th is Monday. Diff = 4 days.
    await logItem('2024-03-11', '12:00', 'Monday Food');

    // 4. This Year (2024-01-01) -> "Mon, Jan 1"
    await logItem('2024-01-01', '12:00', 'Year Food');

    // 5. Prior Year (2023-12-31) -> "Dec 31, 2023"
    await logItem('2023-12-31', '12:00', 'Old Food');

    await tester.step('smart-dates', {
        description: 'Check date formatting',
        verifications: [
            { spec: 'Today shows time only', check: async () => await expect(page.locator('.entry-item').filter({ hasText: 'Today Food' }).locator('.time')).toHaveText('12:00') },
            { spec: 'Yesterday shows Yesterday @ Time', check: async () => await expect(page.locator('.entry-item').filter({ hasText: 'Yesterday Food' }).locator('.time')).toHaveText('Yesterday @ 12:00') },
            { spec: 'Recent shows Day @ Time', check: async () => await expect(page.locator('.entry-item').filter({ hasText: 'Monday Food' }).locator('.time')).toHaveText('Monday @ 12:00') },
            { spec: 'This Year shows Date', check: async () => await expect(page.locator('.entry-item').filter({ hasText: 'Year Food' }).locator('.time')).toHaveText('Mon, Jan 1') },
            { spec: 'Old shows Date with Year', check: async () => await expect(page.locator('.entry-item').filter({ hasText: 'Old Food' }).locator('.time')).toHaveText('Dec 31, 2023') }
        ]
    });

    tester.generateDocs();
});
