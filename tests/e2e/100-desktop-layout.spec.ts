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

    // Promise Gate for Gemini
    let resolveGemini: () => void = () => { };
    let geminiPromise = new Promise<void>(r => { resolveGemini = r; });

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
    
    // Dynamic data for Edit Flow
    let saladName = 'Desktop Salad';
    let saladCalories = 500;

    // Override only the Events values to provide our Desktop Salad
    await page.route('**/values/Events**', async route => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({
                json: {
                    values: [
                        ['ev-1', `${today}T12:00:00Z`, 'log/entryConfirmed', JSON.stringify({ 
                            entry: {
                                id: 'entry-1',
                                date: today,
                                time: '12:00',
                                mealType: 'Lunch',
                                description: saladName,
                                calories: saladCalories,
                                protein: 20,
                                fat: 10,
                                carbs: 50
                            } 
                        })]
                    ]
                }
            });
        } else if (method === 'POST') {
            const body = route.request().postDataJSON();
            if (body && body.values && body.values[0]) {
                try {
                    const payload = JSON.parse(body.values[0][3]);
                    if (payload.entry) {
                        saladName = payload.entry.description;
                        saladCalories = payload.entry.calories;
                    }
                } catch (e) {
                    console.log('Failed to parse POST body', e);
                }
            }
            await route.fulfill({ json: { updates: { updatedRange: 'Events!A2' } } });
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

    // 2. Settings Page
    await page.locator('.desktop-sidebar').getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Goals & Targets' })).toBeVisible();

    await tester.step('settings-page-desktop', {
        description: 'Settings page in desktop layout',
        verifications: [
            { spec: 'Goals header visible', check: async () => await expect(page.getByRole('heading', { name: 'Goals & Targets' })).toBeVisible() }
        ]
    });

    // Enable Fiber and Sodium goals
    const fiberCard = page.locator('.macro-card', { hasText: 'Fiber' });
    const fiberInput = fiberCard.locator('input[type="number"]').first();
    await fiberInput.fill('35');
    
    const fiberToggle = fiberCard.locator('input[type="checkbox"]');
    if (!(await fiberToggle.isChecked())) {
        await fiberCard.locator('.toggle-slider').click();
    }
    
    const sodiumCard = page.locator('.macro-card', { hasText: 'Sodium' });
    const sodiumLimitInput = sodiumCard.locator('input[type="number"]').first();
    await sodiumLimitInput.fill('2000');

    const sodiumToggle = sodiumCard.locator('input[type="checkbox"]');
    if (!(await sodiumToggle.isChecked())) {
        await sodiumCard.locator('.toggle-slider').click();
    }

    const dashboardToggle = page.locator('.toggle-row', { hasText: 'Show on Dashboard' }).locator('input[type="checkbox"]');
    if (!(await dashboardToggle.isChecked())) {
        await page.locator('.toggle-row', { hasText: 'Show on Dashboard' }).locator('.toggle-slider').click();
    }

    // Save settings
    await page.getByText('Save Changes').click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    await tester.step('dashboard-health-summary-desktop', {
        description: 'Health summary with Fiber and Sodium visible on desktop dashboard',
        verifications: [
            { spec: 'Fiber bar visible', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Fiber' })).toBeVisible() },
            { spec: 'Sodium bar visible', check: async () => await expect(page.locator('.health-bar-container', { hasText: 'Sodium' })).toBeVisible() }
        ]
    });

    // 3. Log Page
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

    // Log a new food using the Gemini mock
    await page.getByText('Text').click();
    await page.locator('textarea').fill('High Sodium Ramen');
    await page.getByText('Analyze').click();

    resolveGemini();

    await expect(page.getByLabel('Log Description')).toHaveValue('High Sodium Ramen');

    await tester.step('log-form-pinned-desktop', {
        description: 'Log form shows pinned Fiber and Sodium on desktop',
        verifications: [
            { spec: 'Fiber pinned', check: async () => await expect(page.getByText('🌾 Fiber')).toBeVisible() },
            { spec: 'Sodium pinned', check: async () => await expect(page.getByText('🧂 Sodium')).toBeVisible() }
        ]
    });

    // Expand details
    await page.locator('.icon-toggle').click();
    await expect(page.getByText('Sugar', { exact: true })).toBeVisible();

    await tester.step('log-form-expanded-desktop', {
        description: 'Expanded log form on desktop',
        verifications: [
            { spec: 'Sugar visible', check: async () => await expect(page.getByText('Sugar', { exact: true })).toBeVisible() }
        ]
    });

    await page.getByText('Save Entry').click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    // 4. Health Breakdown Modal
    const sodiumBar = page.locator('.health-bar-container', { hasText: 'Sodium' });
    await sodiumBar.click();

    await tester.step('health-breakdown-desktop', {
        description: 'Health breakdown modal on desktop',
        verifications: [
            { spec: 'Modal is visible', check: async () => await expect(page.getByRole('dialog')).toBeVisible() },
            { spec: 'Modal title is correct', check: async () => await expect(page.getByRole('heading', { name: 'Sodium Breakdown' })).toBeVisible() }
        ]
    });

    // Close modal
    await page.locator('.modal-content .primary-btn').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 5. Network & Sync Page
    await page.locator('.desktop-sidebar').getByRole('link', { name: 'Settings' }).click();
    await page.goto('/settings/network');
    await expect(page.getByRole('heading', { name: 'Network & Sync' })).toBeVisible();

    await tester.step('settings-network-desktop', {
        description: 'Network & Sync page in desktop layout',
        verifications: [
            { spec: 'Heading visible', check: async () => await expect(page.getByRole('heading', { name: 'Network & Sync' })).toBeVisible() }
        ]
    });

    // 6. Switcher Page
    await page.locator('.desktop-header .user-chip').click();
    await expect(page).toHaveURL(/\/switcher/);
    await expect(page.getByRole('heading', { name: 'Switch User' })).toBeVisible();

    await tester.step('switcher-page-desktop', {
        description: 'Switcher page in desktop layout',
        verifications: [
            { spec: 'Mock users visible', check: async () => await expect(page.getByText('Bob')).toBeVisible() }
        ]
    });

    // 7. Privacy Page
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy for Food Sheets' })).toBeVisible();

    await tester.step('privacy-page-desktop', {
        description: 'Privacy page in desktop layout',
        verifications: [
            { spec: 'Heading visible', check: async () => await expect(page.getByRole('heading', { name: 'Privacy Policy for Food Sheets' })).toBeVisible() }
        ]
    });

    // 8. Sharing Page
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

    // 6. Entry Details Page
    await page.goto('/');
    await expect(page.getByText('Desktop Salad')).toBeVisible();
    await page.getByText('Desktop Salad').click();
    
    // The details page should show the Back link and the nutrition info
    await expect(page.getByText('Back', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Item Name')).toHaveValue('Desktop Salad');

    await tester.step('entry-details-desktop', {
        description: 'Entry Details page in desktop layout',
        verifications: [
            { spec: 'Back link visible', check: async () => await expect(page.getByText('Back', { exact: true })).toBeVisible() },
            { spec: 'Nutrition info visible', check: async () => await expect(page.getByText('Calories')).toBeVisible() }
        ]
    });

    // 9. Edit Flow
    await page.goto('/');
    await expect(page.getByText('Desktop Salad')).toBeVisible();
    await page.getByText('Desktop Salad').click();
    
    await page.getByLabel('Item Name').fill('Updated Desktop Salad');
    await page.getByLabel('Calories').fill('600');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(\?|$)/);
    await expect(page.getByText('Updated Desktop Salad')).toBeVisible();
    await expect(page.getByRole('link', { name: /Updated Desktop Salad/ }).getByText('600 kcal')).toBeVisible();

    await tester.step('edit-flow-desktop', {
        description: 'Edit flow in desktop layout',
        verifications: [
            { spec: 'Updated name visible', check: async () => await expect(page.getByText('Updated Desktop Salad')).toBeVisible() },
            { spec: 'Updated calories visible', check: async () => await expect(page.getByRole('link', { name: /Updated Desktop Salad/ }).getByText('600 kcal')).toBeVisible() }
        ]
    });


    await tester.generateDocs();
});

