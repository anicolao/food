import { test, expect } from './fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { mockDriveAPI } from './helpers/mock-drive';

test.use({ viewport: { width: 1280, height: 800 } });

test('US-112: Desktop Layout and Navigation', async ({ page }, testInfo) => {
    test.slow();
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Desktop Layout', 'Verifying key screens in desktop form factor.');

    // Install Clock to ensure deterministic dates
    const MOCK_DATE = '2024-06-15T12:00:00Z';
    await page.clock.install({ time: new Date(MOCK_DATE) });
    const today = '2024-06-15';

    // standard mocks
    await page.addInitScript(async () => {
        if (navigator.serviceWorker) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }),
                    revoke: (token: string, cb: any) => cb()
                }
            }
        };

        // Inject shared users for Switcher page
        localStorage.setItem('food_log_shared_users', JSON.stringify([
            { folderId: 'SHARED_1', name: 'Alice', avatar: '', lastVisited: Date.now() },
            { folderId: 'SHARED_2', name: 'Bob', avatar: '', lastVisited: Date.now() - 1000 }
        ]));
        
        // Ensure logged in
        localStorage.setItem('food_log_access_token', 'mock-token');
        localStorage.setItem('food_log_token_expiry', (Date.now() + 3600000).toString());
    });

    // Block real Google Identity script
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

    // Robust Google API Mocks
    await mockDriveAPI(page);
    
    // Override only the Events values to provide our Desktop Salad
    await page.route('**/values/Events**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                json: {
                    values: [
                        ['ev-1', `${today}T12:00:00Z`, 'log/entryConfirmed', JSON.stringify({ 
                            entry: {
                                id: 'entry-1',
                                date: today,
                                time: '12:00',
                                mealType: 'Lunch',
                                description: 'Desktop Salad',
                                calories: 500,
                                protein: 20,
                                fat: 10,
                                carbs: 50
                            } 
                        })]
                    ]
                }
            });
        } else {
            await route.fallback();
        }
    });

    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

    // 1. Dashboard (Today)
    await page.goto('/');
    await expect(page.getByTestId('debug-load')).toBeVisible({ timeout: 30000 });
    
    // Wait for auth to be ready
    await page.waitForFunction(() => (window as any)._authReady);

    // Sign In if needed (should be skipped by token injection, but let's be safe)
    if (await page.getByText('Sign In with Google').isVisible()) {
        await page.getByText('Sign In with Google').click();
    }
    
    // Wait for the specific salad to appear
    await expect(page.getByText('Desktop Salad')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-status="synced"]')).toBeVisible({ timeout: 15000 });

    await tester.step('dashboard-desktop', {
        description: 'Dashboard shows desktop layout',
        verifications: [
            { spec: 'Sidebar visible', check: async () => await expect(page.locator('.desktop-nav')).toBeVisible() },
            { spec: 'Mobile nav hidden', check: async () => await expect(page.locator('.mobile-nav-wrapper')).not.toBeVisible() },
            { spec: 'Header visible', check: async () => await expect(page.locator('.desktop-header')).toBeVisible() }
        ]
    });

    // 2. Log Page
    // Use more robust selector and wait for navigation
    const logLink = page.locator('.desktop-sidebar').getByRole('link', { name: 'Log Food' });
    await expect(logLink).toBeVisible();
    await logLink.click();
    
    await expect(page).toHaveURL(/\/log/);
    await expect(page.getByRole('heading', { name: 'Log Food' })).toBeVisible();

    await tester.step('log-page-desktop', {
        description: 'Log page in desktop layout',
        verifications: [
            { spec: 'Sidebar still visible', check: async () => await expect(page.locator('.desktop-nav')).toBeVisible() }
        ]
    });

    // 3. Settings Page
    await page.locator('.desktop-sidebar').getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Goals & Targets' })).toBeVisible();

    await tester.step('settings-page-desktop', {
        description: 'Settings page in desktop layout',
        verifications: [
            { spec: 'Goals header visible', check: async () => await expect(page.getByRole('heading', { name: 'Goals & Targets' })).toBeVisible() }
        ]
    });

    // 4. Switcher Page
    await page.locator('.desktop-header .user-chip').click();
    await expect(page).toHaveURL(/\/switcher/);
    await expect(page.getByRole('heading', { name: 'Switch User' })).toBeVisible();

    await tester.step('switcher-page-desktop', {
        description: 'Switcher page in desktop layout',
        verifications: [
            { spec: 'Mock users visible', check: async () => await expect(page.getByText('Bob')).toBeVisible() }
        ]
    });

    // 5. Sharing Page
    const SHARED_FOLDER_ID = 'SHARED_123';
    const SHARED_DB_ID = 'SHARED_DB_456';

    // Mock finding the DB inside the shared folder
    await page.route(`**/drive/v3/files?q=*${SHARED_FOLDER_ID}*`, async route => {
        await route.fulfill({
            json: {
                files: [{
                    id: SHARED_DB_ID,
                    name: 'Food Log Data',
                    modifiedTime: '2024-01-01T12:00:00Z',
                    appProperties: { type: 'food_tracker_db' }
                }]
            }
        });
    });

    // Mock Data for the Shared DB
    await page.route(`**/*${SHARED_DB_ID}/values/Events*`, async route => {
        const events = [
            { eventId: 's1', timestamp: '2024-06-15T12:00:00Z', type: 'log/entryConfirmed', payload: { entry: { id: 'se1', date: '2024-06-15', time: '12:00', description: 'Shared Salad', calories: 300, protein: 10, carbs: 40, fat: 5, mealType: 'Lunch' } } }
        ];
        await route.fulfill({
            json: {
                values: events.map(e => [e.eventId, e.timestamp, e.type, JSON.stringify(e.payload)])
            }
        });
    });

    await page.goto(`/sharing?folderId=${SHARED_FOLDER_ID}&date=2024-06-15`);
    await expect(page.getByText('Shared Salad')).toBeVisible({ timeout: 10000 });

    await tester.step('sharing-page-desktop', {
        description: 'Sharing page in desktop layout',
        verifications: [
            { spec: 'Sidebar shows Switch User', check: async () => await expect(page.locator('.desktop-sidebar').getByText('Switch User')).toBeVisible() },
            { spec: 'Shared header visible', check: async () => await expect(page.getByText('Shared Food Log')).toBeVisible() }
        ]
    });

    await tester.generateDocs();
});
