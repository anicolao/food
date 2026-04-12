import { test, expect } from './fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { mockDriveAPI } from './helpers/mock-drive';

test('Issue #95: Hard Expiry Logout', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Hard Expiry Logout', 'Verifying explicit logout exactly when token expires.');

    // Mock Clock
    const T0 = new Date('2024-03-15T16:00:00Z');
    await page.clock.install({ time: T0 });

    // Mock Google Script
    await page.addInitScript(async () => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({
                        requestAccessToken: (options: any) => {
                            // Immediately fail silent refresh to test hard expiry
                            if (options.prompt === '') {
                                console.log('[Mock] Silent refresh failed');
                                // Don't call callback or call with error
                                // But if it's already expired, the hard expiry timer should catch it
                                return;
                            }
                            c.callback({
                                access_token: 'mock-token',
                                expires_in: 3600
                            });
                        }
                    }),
                    revoke: (token: string, callback: () => void) => {
                        callback();
                    }
                }
            }
        };
    });

    await page.route('https://accounts.google.com/gsi/client', route => route.abort());
    await mockDriveAPI(page);

    await page.goto('/');
    
    // Initial login
    await page.clock.fastForward(1000);
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Sign In with Google').click();
    await expect(page.locator('.mobile-nav a').filter({ hasText: 'Settings' }).first()).toBeVisible();

    await tester.step('explicit_logout_at_expiry', {
        description: 'Verify logout happens automatically when token expires',
        verifications: [
            {
                spec: 'Logs out exactly at expiry time',
                check: async () => {
                    // Check that we are logged in
                    await expect(page.locator('.mobile-nav a').filter({ hasText: 'Settings' }).first()).toBeVisible();

                    // Fast forward 1 hour (3600 seconds)
                    // The token was issued at T0 + 1s (approx)
                    await page.clock.fastForward(3600 * 1000);

                    // Should be logged out automatically without any interaction
                    await expect(page.getByText('Sign In with Google')).toBeVisible();
                }
            }
        ]
    });

    tester.generateDocs();
});
