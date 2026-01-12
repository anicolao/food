import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test('US-001: User signs in', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Authentication', 'Verify user can sign in.');

    // Mock Google Auth & Drive Discovery
    await page.addInitScript(() => {
        (window as any).google = { accounts: { oauth2: { initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock-token' }) }) } } };
    });

    await page.route('**googleapis.com**', async route => {
        // Minimal mock for auth flow which triggers sync
        await route.fulfill({ json: { files: [{ id: 'mock-id' }] } });
    });

    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    await page.goto('/');
    // Dump content if debug not found
    if (!await page.getByTestId('debug-load').isVisible()) {
        console.log('PAGE CONTENT:', await page.content());
    }

    await expect(page.getByTestId('debug-load')).toBeVisible();
    await tester.step('initial-load', {
        description: 'User sees sign in button',
        verifications: [
            { spec: 'Sign In button visible', check: async () => await expect(page.getByText('Sign In with Google')).toBeVisible() }
        ]
    });

    await page.getByText('Sign In with Google').click();

    await tester.step('authenticated', {
        description: 'User is signed in',
        verifications: [
            { spec: 'Food Log title visible', check: async () => await expect(page.getByText('Today\'s Summary')).toBeVisible() },
            { spec: 'Log Food button visible', check: async () => await expect(page.getByText('Log Food')).toBeVisible() },
            { spec: 'Sign Out button visible', check: async () => await expect(page.getByText('Sign Out')).toBeVisible() }
        ]
    });

    await page.getByText('Sign Out').click();

    await tester.step('signed-out', {
        description: 'User signs out',
        verifications: [
            { spec: 'Sign In button visible', check: async () => await expect(page.getByText('Sign In with Google')).toBeVisible() }
        ]
    });

    tester.generateDocs();
});
