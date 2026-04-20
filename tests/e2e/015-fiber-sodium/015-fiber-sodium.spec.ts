import { test, expect } from '../fixtures';
import { TestStepHelper } from '../helpers/test-step-helper';
import { mockDriveAPI } from '../helpers/mock-drive';

test('US-015: Fiber and Sodium tracking', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Health Tracking', 'User sets fiber and sodium goals and logs food.');

    // Promise Gate for Gemini
    let resolveGemini: () => void = () => { };
    let geminiPromise = new Promise<void>(r => { resolveGemini = r; });

    // Mock Auth & Services
    await page.clock.install({ time: new Date('2024-03-15T16:00:00Z') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/gsi/client', route => route.abort());

    await page.addInitScript(async () => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }),
                    revoke: (token: string, cb: any) => cb()
                }
            }
        };
    });

    // Stateful Mock for Sheets
    const events: any[] = [];

    // Use common mock helper
    await mockDriveAPI(page);

    // Override Sheets for Event Capture
    await page.route('**sheets.googleapis.com**', async route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('append')) {
            const postData = route.request().postDataJSON();
            if (postData && postData.values && postData.values[0]) {
                events.push(postData.values[0]);
            }
            await route.fulfill({ json: { updates: { updatedRange: 'A1' } } });
        } else if (url.includes('values/Events')) {
            if (method === 'GET') {
                await route.fulfill({ json: { values: events } });
            } else {
                await route.fallback();
            }
        } else {
            await route.fallback();
        }
    });

    // Mock Gemini
    await page.route('**generativelanguage.googleapis.com**', async route => {
        await geminiPromise;
        await route.fulfill({
            json: {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                is_label: true,
                                item_name: 'High Sodium Ramen',
                                calories: 600,
                                fat: { total: 20 },
                                carbohydrates: { total: 80 },
                                protein: 15,
                                details: {
                                    fiber: 10,
                                    sodium: 1800
                                }
                            })
                        }]
                    }
                }]
            }
        });
    });

    await page.goto('/');
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Sign In with Google').click();

    // 1. Navigate to Settings
    await page.locator('a', { hasText: 'Settings' }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Goals & Targets' })).toBeVisible();

    // 2. Adjust Fiber goal and Sodium limit
    const fiberInput = page.locator('.macro-card', { hasText: 'Fiber' }).locator('input[type="number"]').first();
    await fiberInput.fill('35');
    
    const sodiumLimitInput = page.locator('.macro-card', { hasText: 'Sodium' }).locator('input[type="number"]').first();
    await sodiumLimitInput.fill('2000');

    // Enable "Show on Dashboard"
    await page.locator('.toggle-row', { hasText: 'Show on Dashboard' }).locator('.toggle-slider').click();

    await tester.step('settings-configured', {
        description: 'Health targets configured in settings',
        verifications: [
            { spec: 'Fiber input updated', check: async () => await expect(fiberInput).toHaveValue('35') },
            { spec: 'Sodium limit input updated', check: async () => await expect(sodiumLimitInput).toHaveValue('2000') }
        ]
    });

    // Save settings
    await page.getByText('Save Changes').click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    // 4. Verify HealthSummary is visible and shows correct targets
    await tester.step('dashboard-health-summary', {
        description: 'Health summary visible on dashboard',
        verifications: [
            { spec: 'Fiber bar visible', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Fiber' })).toBeVisible() },
            { spec: 'Fiber target is 35g', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Fiber' }).locator('.value')).toContainText('/ 35g') },
            { spec: 'Sodium bar visible', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Sodium' })).toBeVisible() },
            { spec: 'Sodium target is 2000mg', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Sodium' }).locator('.value')).toContainText('/ 2000mg') }
        ]
    });

    // 5. Log a high-sodium food
    await page.getByLabel('Log new food entry').first().click();
    await expect(page).toHaveURL(/\/log/);
    
    await page.getByText('Text').click();
    const textarea = page.locator('textarea');
    await textarea.fill('High Sodium Ramen');
    await page.getByText('Analyze').click();

    resolveGemini();

    // Wait for analysis
    await expect(page.getByLabel('Log Description')).toHaveValue('High Sodium Ramen');
    
    // Expand details to verify emojis
    await page.locator('.icon-toggle').click();
    await expect(page.getByText('Sugar', { exact: true })).toBeVisible();
    await tester.step('nutrition-form-icons', {
        description: 'Nutrition form shows fiber and sodium icons',
        verifications: [
            { spec: 'Fiber icon visible', check: async () => await expect(page.getByText('🌾 Fiber')).toBeVisible() },
            { spec: 'Sodium icon visible', check: async () => await expect(page.getByText('🧂 Sodium')).toBeVisible() }
        ]
    });

    await page.getByText('Save Entry').click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    // 6. Verify Sodium bar reflects increase and turns red
    const sodiumBar = page.locator('.health-bar-container', { hasText: 'Sodium' });
    
    await tester.step('dashboard-ramen-logged', {
        description: 'Sodium bar reflects increase',
        verifications: [
            { spec: 'Sodium value updated', check: async () => await expect(sodiumBar.locator('.value')).toContainText('1800 / 2000mg') },
            { spec: 'Fiber value updated', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Fiber' }).locator('.value')).toContainText('10 / 35g') }
        ]
    });

    // Log another one to exceed limit
    // Re-mock Gemini for second call
    geminiPromise = new Promise<void>(r => { resolveGemini = r; });
    await page.route('**generativelanguage.googleapis.com**', async route => {
        await geminiPromise;
        await route.fulfill({
            json: {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                is_label: true,
                                item_name: 'Another Ramen',
                                calories: 600,
                                fat: { total: 20 },
                                carbohydrates: { total: 80 },
                                protein: 15,
                                details: {
                                    fiber: 10,
                                    sodium: 500
                                }
                            })
                        }]
                    }
                }]
            }
        });
    });

    await page.getByLabel('Log new food entry').first().click();
    await page.getByText('Text').click();
    const textarea2 = page.locator('textarea');
    await textarea2.fill('Another Ramen');
    await page.getByText('Analyze').click();
    
    resolveGemini();

    await expect(page.getByLabel('Log Description')).toHaveValue('Another Ramen');
    await page.getByText('Save Entry').click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    await tester.step('dashboard-limit-exceeded', {
        description: 'Sodium bar turns red when limit exceeded',
        verifications: [
            { spec: 'Sodium total is 2300mg', check: async () => await expect(sodiumBar.locator('.value')).toContainText('2300 / 2000mg') },
            { spec: 'Bar is red', check: async () => {
                const barFill = sodiumBar.locator('.bar-fill');
                // Check if it has the red gradient colors
                const background = await barFill.evaluate(el => window.getComputedStyle(el).background);
                expect(background).toContain('rgb(255, 65, 108)'); 
            }}
        ]
    });

    // 7. Verify Health Breakdown Modal
    await sodiumBar.click();
    
    await tester.step('health-breakdown-modal', {
        description: 'Sodium breakdown modal shows detailed logs',
        verifications: [
            { spec: 'Modal is visible', check: async () => await expect(page.getByRole('dialog')).toBeVisible() },
            { spec: 'Modal title is correct', check: async () => await expect(page.getByRole('heading', { name: 'Sodium Breakdown' })).toBeVisible() },
            { spec: 'First item is High Sodium Ramen (1800mg)', check: async () => {
                const firstItem = page.locator('.modal-content .item').first();
                await expect(firstItem.locator('.name')).toHaveText('High Sodium Ramen');
                await expect(firstItem.locator('.amount')).toHaveText('1800');
            }},
            { spec: 'Second item is Another Ramen (500mg)', check: async () => {
                const secondItem = page.locator('.modal-content .item').nth(1);
                await expect(secondItem.locator('.name')).toHaveText('Another Ramen');
                await expect(secondItem.locator('.amount')).toHaveText('500');
            }}
        ]
    });

    // Close modal
    await page.locator('.modal-content .primary-btn').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    tester.generateDocs();
});
