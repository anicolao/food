import { test, expect } from './fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { mockDriveAPI } from './helpers/mock-drive';

test('Issue #95: Auth Refresh Robustness', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Auth Refresh Robustness', 'Verifying timeout and explicit logout on expiry.');

    // Mock Clock for Timeout Check
    const T0 = new Date('2024-03-15T16:00:00Z');
    await page.clock.install({ time: T0 });

    // Mock Google Script with hanging request option
    await page.addInitScript(async () => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({
                        requestAccessToken: (options: any) => {
                            if (localStorage.getItem('_hangRefresh') === 'true') {
                                console.log('[Mock] Hanging refresh request...');
                                return; // Do nothing, simulate hang
                            }
                            c.callback({
                                access_token: 'mock-token',
                                expires_in: 3600
                            });
                        }
                    }),
                    revoke: (token: string, callback: () => void) => {
                        console.log('[Mock] Revoking token');
                        callback();
                    }
                }
            }
        };
    });

    await page.route('https://accounts.google.com/gsi/client', route => route.abort());
    await mockDriveAPI(page);

    await page.goto('/');
    
    // Fast forward to allow GIS to initialize (it polls every 100ms)
    await page.clock.fastForward(1000);
    await page.waitForFunction(() => (window as any)._authReady);
    
    // Initial login
    await page.getByText('Sign In with Google').click();
    await expect(page.locator('.mobile-nav a').filter({ hasText: 'Settings' }).first()).toBeVisible();

    await tester.step('timeout_when_expired', {
        description: 'Verify logout if refresh hangs and token is expired',
        verifications: [
            {
                spec: 'Logs out after 10s if token expired',
                check: async () => {
                    // Set token to be expired
                    await page.evaluate(() => {
                        localStorage.setItem('food_log_token_expiry', (Date.now() - 1000).toString());
                        localStorage.setItem('_hangRefresh', 'true');
                    });

                    // Reload triggers initializeAuth -> refreshInBackground
                    await page.reload();
                    
                    // Fast forward GIS initialization
                    await page.clock.fastForward(1000);
                    await page.waitForFunction(() => (window as any)._authReady);
                    
                    // We are still "ready" but waiting for refresh
                    // Fast forward 11 seconds to trigger timeout
                    await page.clock.fastForward(11000);
                    
                    // Should be logged out
                    await expect(page.getByText('Sign In with Google')).toBeVisible();
                }
            }
        ]
    });

    await tester.step('no_logout_if_buffer', {
        description: 'Verify app stays logged in if refresh hangs but token still valid (in buffer)',
        verifications: [
            {
                spec: 'Remains logged in if within buffer',
                check: async () => {
                    // Log back in first
                    await page.evaluate(() => {
                        localStorage.setItem('_hangRefresh', 'false');
                    });
                    await page.getByText('Sign In with Google').click();
                    await expect(page.locator('.mobile-nav a').filter({ hasText: 'Settings' }).first()).toBeVisible();

                    // Set token to be in buffer (e.g. 2 mins left)
                    await page.evaluate(() => {
                        localStorage.setItem('food_log_token_expiry', (Date.now() + 120000).toString());
                        localStorage.setItem('_hangRefresh', 'true');
                    });

                    await page.reload();
                    
                    // Fast forward GIS initialization
                    await page.clock.fastForward(1000);
                    await page.waitForFunction(() => (window as any)._authReady);
                    
                    // Fast forward 11 seconds to trigger timeout
                    await page.clock.fastForward(11000);
                    
                    // Should STILL be logged in because token was not yet expired when it timed out
                    await expect(page.locator('.mobile-nav a').filter({ hasText: 'Settings' }).first()).toBeVisible();
                    await expect(page.getByText('Sign In with Google')).not.toBeVisible();
                }
            }
        ]
    });

    tester.generateDocs();
});
