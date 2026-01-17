import { test, expect } from '../fixtures';
import { TestStepHelper } from '../helpers/test-step-helper';
import { mockDriveAPI } from '../helpers/mock-drive';
import * as fs from 'fs';

test('Bug Repro: Edit Persistence on Re-open', async ({ page }, testInfo) => {
    test.slow();
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Bug Repro', 'Verifying edits persist when re-opening an item.');

    // Promise Gate for Gemini
    let resolveGemini: () => void = () => { };
    const geminiPromise = new Promise<void>(r => { resolveGemini = r; });

    // Mock Auth & Clock
    await page.clock.install({ time: new Date('2024-03-15T12:00:00Z') });
    await page.addInitScript(() => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }),
                    revoke: (token: string, cb: any) => cb()
                }
            }
        };
    });
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

    // Basic Service Mock
    await mockDriveAPI(page);
    await page.route(/drive\.mock/, async route => {
        const buffer = fs.readFileSync('tests/e2e/fixtures/apple.png');
        await route.fulfill({ body: buffer, contentType: 'image/png' });
    });

    await page.route('**googleapis.com**', async route => {
        const url = route.request().url();
        if (url.includes('generativelanguage')) {
            await geminiPromise;
            await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ is_label: false, item_name: 'Original Food', calories: 100, fat: { total: 10 }, carbohydrates: { total: 10 }, protein: 10 }) }] } }] } });
        } else {
            await route.continue();
        }
    });

    await page.goto('/');
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Sign In with Google').click();

    // 1. Open Logger (Robust Navigation & Passive Verify)
    await page.goto('/log');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/log/);

    await tester.step('open-logger', {
        description: 'User opens the log page',
        verifications: [
            { spec: 'Camera button visible', check: async () => await expect(page.getByText('Camera').first()).toBeVisible() }
        ]
    });

    // 2. Fill Entry (Action then Verify)
    await page.locator('input[type="file"]:not([capture])').first().setInputFiles([
        'tests/e2e/fixtures/apple.png'
    ]);
    await expect(page.getByText('Analyzing 1 images with Gemini...')).toBeVisible();
    resolveGemini();

    // Wait for analysis result explicitly
    await expect(async () => {
        const val = await page.getByLabel('Log Description').first().inputValue();
        expect(val === 'Original Food').toBeTruthy();
    }).toPass();

    await tester.step('fill-entry', {
        description: 'User uploads image and waits for analysis',
        verifications: [
            {
                spec: 'Description populated', check: async () => {
                    const val = await page.getByLabel('Log Description').first().inputValue();
                    expect(val === 'Original Food').toBeTruthy();
                }
            }
        ]
    });

    // 3. Save Entry
    await page.getByText('Save Entry').click();
    await expect(page.locator('.item-name').filter({ hasText: 'Original Food' }).first()).toBeVisible();

    await tester.step('save-entry', {
        description: 'User saves the entry',
        verifications: [
            { spec: 'Original food visible in list', check: async () => await expect(page.locator('.item-name').filter({ hasText: 'Original Food' }).first()).toBeVisible() }
        ]
    });

    // 4. Verify and Edit
    await page.getByText('Original Food').first().click();
    await page.getByLabel('Item Name').fill('Edited Food');
    await page.getByText('Save Changes').click();
    await page.waitForURL('**/');

    await tester.step('edit-entry', {
        description: 'User edits the existing entry',
        verifications: [
            { spec: 'Edited food visible in list', check: async () => await expect(page.locator('.item-name').filter({ hasText: 'Edited Food' }).first()).toBeVisible() }
        ]
    });

    // 5. Verify Edit Persistence
    await page.reload();
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Edited Food').first().click();
    // No action needed here, just verify state in the step

    await tester.step('verify-persistence', {
        description: 'Edited value persists after reload',
        verifications: [
            // List visibility check is redundant but fine
            {
                spec: 'Detail view shows edited name', check: async () => {
                    await expect(page.getByLabel('Item Name').first()).toHaveValue('Edited Food');
                }
            }
        ]
    });

    tester.generateDocs();
});
