import { test, expect } from '@playwright/test';

test.describe('Offline Support & Sync', () => {
    test('should allow logging while offline and sync when online', async ({ page, context }) => {

        // Mock Sheets & Drive
        await page.route('**googleapis.com**', async route => {
            const url = route.request().url();
            if (url.includes('sheets.googleapis.com')) {
                if (url.includes('append')) {
                    await route.fulfill({ json: { updates: { updatedRange: 'Events!A1' } } });
                } else if (url.includes('values/Events')) {
                    await route.fulfill({ json: { values: [] } });
                } else {
                    await route.fulfill({ json: {} });
                }
            } else if (url.includes('drive/v3/files')) {
                // Discovery mocks
                if (url.includes('files?q=')) {
                    await route.fulfill({ json: { files: [{ id: 'mock-id', name: 'MockFile' }] } });
                } else {
                    await route.fulfill({ json: { id: 'mock-id' } });
                }
            } else if (url.includes('generativelanguage')) {
                await route.fulfill({
                    json: {
                        candidates: [{
                            content: {
                                parts: [{
                                    text: JSON.stringify({
                                        is_label: true,
                                        item_name: 'Offline Banana',
                                        calories: 105,
                                        fat: { total: 0.4 },
                                        carbohydrates: { total: 27 },
                                        protein: 1.3
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

        // 1. Initial Setup: Preload Dashboard and Log page
        // Visit Dashboard first to load its chunks
        await page.goto('/');

        // Check if we need to sign in
        if (page.url().includes('/login') || await page.getByText('Sign In with Google').isVisible()) {
            // Mock Auth (Simplified)
            await page.evaluate(() => {
                (window as any).google = {
                    accounts: { oauth2: { initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }) } }
                };
            });
            await page.getByText('Sign In with Google').click();
            await page.waitForURL('/');
        }

        // Now navigate to Log page (client-side)
        // Try clicking the log link. Use :visible to ensure we get the one currently shown (Sidebar or MobileNav).
        await page.locator('a[href="/log"]:visible').first().click();
        await expect(page).toHaveURL('/log');

        // 2. Go Offline
        await context.setOffline(true);

        // 3. Log Food Item via Image (Text mode doesn't work offline)
        // Upload a file to trigger "Sheet Open" state
        const fileInput = page.locator('input[type="file"]:not([capture])');
        // Create a dummy file on the fly if fixture missing, or use existing
        // We'll trust the repo has fixtures or create one.
        // Better to create a buffer here to be safe and self-contained.
        const buffer = Buffer.from('fake image content');
        await fileInput.setInputFiles({
            name: 'offline-food.jpg',
            mimeType: 'image/jpeg',
            buffer
        });

        // 4. Verify Form Opens (Sheet Open)
        // Image thumbnail should appear
        await expect(page.locator('.sheet-thumb')).toBeVisible();

        // Analysis will start and fail (since offline).
        // We can assume it fails fast or handles it.
        // We wait for the "Log Description" input to be visible.
        await expect(page.getByLabel('Log Description')).toBeVisible({ timeout: 10000 });

        // 5. Fill Manual Details
        await page.getByLabel('Log Description').fill('Offline Banana');
        await page.getByLabel('Cals').fill('100');

        // Click "Save Entry"
        await page.getByRole('button', { name: 'Save Entry' }).click();

        // 6. Verify Optimistic UI
        await expect(page).toHaveURL('/');

        // Check if "Offline Banana" is visible
        await expect(page.getByText('Offline Banana')).toBeVisible();

        // 7. Verify Network Status Indicator
        // Use :visible to avoid strict mode violation (one in DesktopSidebar, one in MobileNav)
        const statusBtn = page.locator('button.network-status:visible');
        await expect(statusBtn).toBeVisible();

        // Retry assertion in case it takes a moment to detect offline
        await expect(statusBtn).toHaveClass(/offline/, { timeout: 10000 });

        // 8. Go Online
        await context.setOffline(false);

        // 9. Verify Sync Status
        // Wait for "Offline" class to disappear
        await expect(statusBtn).not.toHaveClass(/offline/, { timeout: 15000 });

        // Check pending count is gone (no badge)
        await expect(page.locator('.badge')).not.toBeVisible();

        // 10. Refresh and Verify Persistence
        await page.reload();
        await expect(page.getByText('Offline Banana')).toBeVisible();
    });
});
