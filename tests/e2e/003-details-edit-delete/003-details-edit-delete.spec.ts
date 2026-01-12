import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import * as fs from 'fs';

test('US-018 to US-022: Details, Edit and Delete', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Edit/Delete', 'Verifying details page, edit and delete.');

    // Mock Auth & Clock
    await page.clock.install({ time: new Date('2024-03-15T12:00:00') });
    await page.addInitScript(() => {
        (window as any).google = {
            accounts: { oauth2: { initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }) } }
        };
    });
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

    // Basic Service Mock
    await page.route(/drive\.mock/, async route => {
        const buffer = fs.readFileSync('tests/e2e/fixtures/apple.png');
        await route.fulfill({ body: buffer, contentType: 'image/png' });
    });
    await page.route('**googleapis.com**', async route => {
        const url = route.request().url();
        if (url.includes('generativelanguage')) {
            await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ is_label: false, item_name: 'Original Food', calories: 100, fat: { total: 10 }, carbohydrates: { total: 10 }, protein: 10 }) }] } }] } });
        } else if (url.includes('uploadType=multipart')) {
            await route.fulfill({ json: { id: 'file-123', webViewLink: 'https://drive.mock/img.jpg', thumbnailLink: 'https://drive.mock/thumb.jpg' } });
        } else {
            await route.fulfill({ json: { files: [], values: [] } });
        }
    });

    await page.goto('/');
    await page.getByText('Sign In with Google').click();

    // 1. Create Entry
    await page.getByText('Log Food').click();
    await page.locator('input[type="file"]:not([capture])').setInputFiles([
        'tests/e2e/fixtures/apple.png',
        'tests/e2e/fixtures/apple.png'
    ]);

    await expect(page.getByLabel('Item Name')).toHaveValue('Original Food');
    await page.getByLabel('Date').fill('2024-03-15');
    await page.getByText('Save Entry').click();

    // 2. Verify on Home
    await expect(page.getByText('Original Food')).toBeVisible();
    await expect(page.getByText('100 kcal')).toBeVisible();
    // Stats check: 100
    await expect(page.locator('.stat-card').filter({ hasText: 'Calories' }).locator('.value')).toHaveText('100');

    // 3. Go to Details
    await page.getByText('Original Food').click();

    await tester.step('details-view', {
        description: 'Details page loaded',
        verifications: [
            { spec: 'Name field populated', check: async () => await expect(page.getByLabel('Item Name')).toHaveValue('Original Food') },
            { spec: 'Calories field populated', check: async () => await expect(page.getByLabel('Calories')).toHaveValue('100') },
            { spec: 'Multiple images shown', check: async () => await expect(page.locator('.hero-image')).toHaveCount(2) },
            {
                spec: 'Carousel scrolls on click',
                check: async () => {
                    const gallery = page.locator('.gallery');
                    const initialScroll = await gallery.evaluate(el => el.scrollLeft);
                    const box = await gallery.boundingBox();
                    if (box) {
                        // Click on the right side (80% width)
                        await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
                        // Wait for scroll
                        await page.waitForTimeout(500);
                        const newScroll = await gallery.evaluate(el => el.scrollLeft);
                        expect(newScroll).toBeGreaterThan(initialScroll);
                    }
                }
            }
        ]
    });

    // 4. Edit
    await page.getByLabel('Item Name').fill('Edited Food');
    await page.getByLabel('Calories').fill('200');
    // Save
    await page.getByText('Save Changes').click();

    await tester.step('edited-state', {
        description: 'Returned to Home after edit',
        verifications: [
            { spec: 'Name updated in list', check: async () => await expect(page.getByText('Edited Food')).toBeVisible() },
            { spec: 'Calories updated in list', check: async () => await expect(page.getByText('200 kcal')).toBeVisible() },
            { spec: 'Total Calories updated', check: async () => await expect(page.locator('.stat-card').filter({ hasText: 'Calories' }).locator('.value')).toHaveText('200') }
        ]
    });

    // 5. Delete
    await page.getByText('Edited Food').click();

    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept());

    await page.getByText('Delete').click();

    await tester.step('deleted-state', {
        description: 'Returned to Home after delete',
        verifications: [
            { spec: 'Entry removed', check: async () => await expect(page.getByText('Edited Food')).not.toBeVisible() },
            { spec: 'Total Calories reset', check: async () => await expect(page.locator('.stat-card').filter({ hasText: 'Calories' }).locator('.value')).toHaveText('0') }
        ]
    });

    tester.generateDocs();
});
