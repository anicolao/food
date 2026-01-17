import { test, expect } from '../fixtures';
import { TestStepHelper } from '../helpers/test-step-helper';
import { mockDriveAPI } from '../helpers/mock-drive';

test('US-012: User edits entry rationale (Mirrors Unit Test)', async ({ page }, testInfo) => {
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Edit Rationale', 'Verify editing an existing entry updates the rationale.');

    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    // 1. Setup Time
    // Target entry date in unit test is "2026-01-15".
    // We set clock to noon on that day to make it "Today".
    await page.clock.install({ time: new Date('2026-01-15T12:00:00') });

    // 2. Mock APIs
    // Mock Auth
    await page.addInitScript(() => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: (c: any) => ({ requestAccessToken: () => c.callback({ access_token: 'mock' }) }),
                    revoke: (token: string, cb: any) => cb()
                }
            }
        };
    });

    // Block real Google Identity script
    await page.route('https://accounts.google.com/gsi/client', route => route.abort());

    await mockDriveAPI(page);

    // 3. Seed Data (Replicate Unit Test State before Edit)
    const events = [
        // 1. Draft (Ignored by projection usually, but good for completeness if strictly mirroring)
        {
            eventId: 'ev-1', timestamp: '2026-01-15T06:30:00Z', type: 'log/draftGenerated',
            payload: { "imagesCount": 0, "rawJson": { "item_name": "Breakfast Oatmeal", "rationale": "Old rationale" }, "inputType": "text" }
        },
        // 2. Confirmed Breakfast
        {
            eventId: 'ev-2', timestamp: '2026-01-15T06:36:00Z', type: 'log/entryConfirmed',
            payload: { "entry": { "id": "721341fa-83a6-40c3-b0f8-7b8225d239f1", "date": "2026-01-15", "time": "06:36", "mealType": "Breakfast", "description": "Breakfast Oatmeal with Chia and Skim Milk", "rationale": "Estimated nutrition based on standard Canadian values...", "calories": 236, "fat": 4.5, "carbs": 36, "protein": 13.4, "imageDriveUrl": "" } }
        },
        // 3. Confirmed Lunch (Target for Edit)
        {
            eventId: 'ev-3', timestamp: '2026-01-15T11:51:00Z', type: 'log/entryConfirmed',
            payload: { "entry": { "id": "ec693587-27f8-4172-8958-a7c0ff00b101", "date": "2026-01-15", "time": "11:51", "mealType": "Lunch", "description": "Ham and creamy sauce low carb tortilla wrap", "rationale": "The estimation is based on two Mission Carb Balance soft taco tortillas...", "calories": 285, "fat": 11.5, "carbs": 33, "protein": 30, "imageDriveUrl": "" } }
        }
    ];

    // Intercept Google Sheets "Get Events" to return our seed data
    // Use a very broad pattern to ensure we catch it over the mockDriveAPI default
    await page.route('**/values/Events*', async route => {
        const url = route.request().url();
        console.log('INTERCEPTED SHEET REQ:', url);
        if (route.request().method() === 'GET') {
            console.log('RETURNING SEED DATA');
            const rows = events.map(e => [
                e.eventId,
                e.timestamp,
                e.type,
                JSON.stringify(e.payload)
            ]);
            await route.fulfill({ json: { values: rows } });
        } else {
            await route.continue();
        }
    });

    // Intercept "Append Row" for the Edit action
    await page.route('**/values/Events!A1:append*', async route => {
        await route.fulfill({ json: { updates: { updatedRange: 'Events!A4' } } });
    });

    // 4. Load App
    await page.goto('/');

    // Allow polling to initialize tokenClient
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Sign In with Google').click();

    // Wait for data load
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');
    await expect(page.getByText('Ham and creamy sauce')).toBeVisible();

    await tester.step('initial-state', {
        description: 'Dashboard loaded with seeded data',
        verifications: [
            { spec: 'Lunch entry visible', check: async () => await expect(page.getByText('Ham and creamy sauce')).toBeVisible() },
            { spec: 'Calories correct', check: async () => await expect(page.locator('.item-cal').filter({ hasText: '285' })).toBeVisible() }
        ]
    });

    // 5. Navigate to Edit
    await page.getByText('Ham and creamy sauce').click();
    await expect(page).toHaveURL(/entry\?id=ec693587-27f8-4172-8958-a7c0ff00b101/);

    // 6. Verify Old Rationale
    // 6. Verify Old Rationale
    const oldRationaleSnippet = 'The estimation is based on two Mission Carb Balance soft taco tortillas';
    // Use toHaveValue with Regex for partial match on textarea content
    await expect(page.getByLabel('Rationale / Notes')).toHaveValue(new RegExp(oldRationaleSnippet));

    // 7. Perform Edit (Mirror Unit Test Change)
    // Unit test adds: "...and 1 tablespoon of Bitch'n sauce"
    const newRationale = "The estimation is based on two Mission Carb Balance soft taco tortillas (approx. 60 kcal, 2g fat, 15g carbs, 4g protein each), 4 oz (113g) of lean deli ham (approx. 125 kcal, 3.5g fat, 2g carbs, 21.5g protein), and 1 tablespoon of Bitch'n sauce";

    await page.getByLabel('Rationale / Notes').fill(newRationale);

    // 8. Save
    await page.getByText('Save Changes').click();
    await expect(page).toHaveURL(/\/$/); // Back to dashboard

    // 9. Verify Edit persisted in UI
    // Navigate back to entry to see details? OR, if dashboard shows it?
    // Dashboard usually only shows Description. Prompt says: "Verify that when you open the listing whose text is edited that the edited text appears in the UI."
    // So we must open it again.

    await page.getByText('Ham and creamy sauce').click();
    await expect(page).toHaveURL(/entry\?id=ec693587-27f8-4172-8958-a7c0ff00b101/);

    await tester.step('verified-edit', {
        description: 'Entry updated with new rationale',
        verifications: [
            { spec: 'Rationale contains new text', check: async () => await expect(page.getByLabel('Rationale / Notes')).toHaveValue(newRationale) },
            { spec: 'Specific phrase present', check: async () => await expect(page.getByLabel('Rationale / Notes')).toHaveValue(/Bitch'n sauce/) }
        ]
    });

    tester.generateDocs();
});
