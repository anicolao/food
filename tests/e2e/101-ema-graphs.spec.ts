import { test, expect } from './fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { mockDriveAPI } from './helpers/mock-drive';

test('US-114: EMA Graphs', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('EMA Graphs', 'Verifying EMA graphs on desktop and mobile.');

    // Install Clock
    const MOCK_DATE = '2024-06-15T12:00:00Z';
    await page.clock.install({ time: new Date(MOCK_DATE) });
    const today = '2024-06-15';

    await page.addInitScript(async () => {
        localStorage.setItem('food_log_access_token', 'mock-token');
        localStorage.setItem('food_log_token_expiry', (Date.now() + 3600000).toString());
    });

    await mockDriveAPI(page);

    // Mock Events to have some history
    await page.route('**/values/Events', async route => {
        if (route.request().method() === 'GET') {
            const values = [];
            // Generate 10 days of data
            for (let i = 0; i < 10; i++) {
                const date = new Date('2024-06-15');
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                values.push([
                    `ev-${i}`, 
                    `${dateStr}T12:00:00Z`, 
                    'log/entryConfirmed', 
                    JSON.stringify({ 
                        entry: {
                            id: `entry-${i}`,
                            date: dateStr,
                            time: '12:00',
                            description: 'Past Meal',
                            calories: 2000 - i * 10,
                            protein: 150,
                            fat: 70,
                            carbs: 200,
                            details: { fiber: 30, sodium: 2000 }
                        } 
                    })
                ]);
            }
            await route.fulfill({ json: { values } });
        } else {
            await route.fulfill({ json: { updates: { updatedRange: 'Events!A2' } } });
        }
    });

    // 1. Desktop View
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByTestId('debug-load')).toBeVisible();
    
    await tester.step('ema-desktop-visibility', {
        description: 'EMA graphs are visible on desktop',
        verifications: [
            { spec: 'Desktop EMA wrapper visible', check: async () => await expect(page.locator('.ema-desktop-wrapper')).toBeVisible() },
            { spec: 'Calories EMA chart exists', check: async () => await expect(page.locator('.ema-desktop-wrapper').getByText('Calories')).toBeVisible() },
            { spec: 'Fiber EMA chart exists', check: async () => await expect(page.locator('.ema-desktop-wrapper').getByText('Fiber')).toBeVisible() }
        ]
    });

    // 2. Mobile View
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByTestId('debug-load')).toBeVisible();

    await tester.step('ema-mobile-initial', {
        description: 'EMA graphs are hidden on mobile by default',
        verifications: [
            { spec: 'Mobile EMA wrapper not visible', check: async () => await expect(page.locator('.ema-mobile-wrapper')).not.toBeVisible() },
            { spec: 'Toggle button exists', check: async () => await expect(page.locator('.ema-toggle')).toBeVisible() }
        ]
    });

    // Toggle on
    await page.locator('.ema-toggle').click();

    await tester.step('ema-mobile-toggled', {
        description: 'EMA graphs are visible on mobile after toggle',
        verifications: [
            { spec: 'Mobile EMA wrapper visible', check: async () => await expect(page.locator('.ema-mobile-wrapper')).toBeVisible() },
            { spec: 'Protein EMA chart exists', check: async () => await expect(page.locator('.ema-mobile-wrapper').getByText('Protein')).toBeVisible() },
            { spec: 'Sodium EMA chart exists', check: async () => await expect(page.locator('.ema-mobile-wrapper').getByText('Sodium')).toBeVisible() }
        ]
    });

    // 3. Hover Interaction
    await tester.step('ema-chart-hover', {
        description: 'Hovering on an EMA chart shows indicator and value',
        verifications: [
            { 
                spec: 'Hover on Calories chart shows value', 
                check: async () => {
                    const chart = page.locator('svg[aria-label="EMA Chart for Calories"]').first();
                    await chart.hover({ position: { x: 80, y: 30 } });
                    await expect(page.locator('.hover-value')).toBeVisible();
                } 
            }
        ]
    });

    await tester.generateDocs();
});
