import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test('US-023: Auth Persistence', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Auth Persistence', 'Verifying session survives reload.');

    // Mock Clock for Expiry Check (Start at T0)
    const T0 = new Date('2024-03-15T12:00:00');
    await page.clock.install({ time: T0 });

    // Mock Google Script
    await page.addInitScript(() => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({
                        requestAccessToken: () => c.callback({
                            access_token: 'mock-persistent-token',
                            expires_in: 3600 // 1 hour
                        })
                    })
                }
            }
        };
    });
    // Block real GSI
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

    // Mock Services (Minimal)
    await page.route('**googleapis.com**', async route => {
        const url = route.request().url();
        if (url.includes('drive/v3/files')) {
            await route.fulfill({ json: { files: [] } });
        } else if (url.includes('sheets')) {
            await route.fulfill({ json: { values: [] } });
        } else {
            await route.fulfill({ json: {} });
        }
    });

    await page.goto('/');
    // Allow polling to initialize tokenClient
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Sign In with Google').click();
    await expect(page.getByText('Log Food')).toBeVisible();

    await tester.step('persisted', {
        description: 'Reload page and verify session',
        verifications: [
            {
                spec: 'Token in localStorage',
                check: async () => {
                    const token = await page.evaluate(() => localStorage.getItem('food_log_access_token'));
                    expect(token).toBe('mock-persistent-token');
                }
            },
            {
                spec: 'User still logged in after reload',
                check: async () => {
                    await page.reload();
                    await expect(page.getByText('Log Food')).toBeVisible();
                    // Should NOT see "Sign In" button
                    await expect(page.getByText('Sign In with Google')).not.toBeVisible();
                }
            }
        ]
    });

    // Test Expiry
    await tester.step('expiry', {
        description: 'Simulate token expiration',
        verifications: [
            {
                spec: 'Logged out after expiry',
                check: async () => {
                    // Update stored expiry to be in the past
                    await page.evaluate(() => {
                        localStorage.setItem('food_log_token_expiry', (Date.now() - 1000).toString());
                    });

                    await page.reload();
                    await expect(page.getByText('Sign In with Google')).toBeVisible();
                }
            }
        ]
    });

    tester.generateDocs();
});
