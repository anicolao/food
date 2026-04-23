import { test, expect } from './fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { mockDriveAPI } from './helpers/mock-drive';

test('US-114: EMA Mobile Layout and Target/Limit Lines', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('EMA Mobile Layout', 'Demonstrating the mobile layout and target/limit lines on graphs.');

    // Install Clock
    const MOCK_DATE = '2024-06-15T12:00:00Z';
    await page.clock.install({ time: new Date(MOCK_DATE) });

    await page.addInitScript(async () => {
        localStorage.setItem('food_log_access_token', 'mock-token');
        localStorage.setItem('food_log_token_expiry', (Date.now() + 3600000).toString());
    });

    await mockDriveAPI(page);

    // Mock Events to have some history
    await page.route('**/values/Events', async route => {
        if (route.request().method() === 'GET') {
            const values = [];
            // Generate 15 days of data to see EMA trend
            for (let i = 0; i < 15; i++) {
                const date = new Date('2024-06-15');
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                // Varied calories to show a curve
                const calories = 2000 + Math.sin(i * 0.5) * 500;
                
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
                            calories: calories,
                            protein: 150,
                            fat: 70,
                            carbs: 250,
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

    // Mobile View
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/');
    await expect(page.getByTestId('debug-load')).toBeVisible();

    // 1. Initial State
    await tester.step('mobile-dashboard-initial', {
        description: 'Dashboard on mobile initially hides trends',
        verifications: [
            { spec: 'Trends button exists', check: async () => await expect(page.locator('.ema-toggle')).toBeVisible() },
            { spec: 'Trends wrapper is hidden', check: async () => await expect(page.locator('.ema-mobile-wrapper')).not.toBeVisible() }
        ]
    });

    // 2. Toggle Trends
    await page.locator('.ema-toggle').click();
    
    // Wait for slide transition
    await page.waitForTimeout(500);

    await tester.step('mobile-dashboard-trends', {
        description: 'Trends are visible after clicking the toggle button',
        verifications: [
            { spec: 'Trends wrapper is visible', check: async () => await expect(page.locator('.ema-mobile-wrapper')).toBeVisible() },
            { spec: 'Calories graph is shown', check: async () => await expect(page.locator('.ema-mobile-wrapper').getByText('Calories')).toBeVisible() }
        ]
    });

    // 3. Verify Target/Limit Lines
    await tester.step('ema-graph-lines', {
        description: 'Graphs show target and limit lines',
        verifications: [
            { 
                spec: 'Calories graph has target line', 
                check: async () => {
                    const caloriesChart = page.locator('.ema-mobile-wrapper svg[aria-label="EMA Chart for Calories"]');
                    await expect(caloriesChart.locator('.target-line')).toHaveCount(1); // Just target
                    await expect(caloriesChart.locator('text.target-label')).toHaveText('2000');
                } 
            },
            {
                spec: 'Sodium graph has limit line',
                check: async () => {
                    const sodiumChart = page.locator('.ema-mobile-wrapper svg[aria-label="EMA Chart for Sodium"]');
                    await expect(sodiumChart.locator('.target-line')).toHaveCount(1); // Just limit
                    await expect(sodiumChart.locator('text.target-label')).toHaveText('2300');
                }
            }
        ]
    });

    await tester.generateDocs();
});
