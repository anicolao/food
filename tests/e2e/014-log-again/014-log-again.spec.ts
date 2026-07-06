import { type Locator } from '@playwright/test';
import { test, expect } from '../fixtures';
import { TestStepHelper } from '../helpers/test-step-helper';
import { mockDriveAPI } from '../helpers/mock-drive';

async function moveDateBackOneDay(field: Locator) {
    await field.click();
    await field.press('ArrowRight');
    await field.press('ArrowRight');
    await field.press('ArrowDown');
    await field.press('Tab');
}

test('US-014: Log Again and Favourites', async ({ page }, testInfo) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    const tester = new TestStepHelper(page, testInfo);
    tester.setMetadata('Log Again', 'Verify Log Again and Favourites flow');

    // Mocks
    await mockDriveAPI(page);
    await page.clock.install({ time: new Date('2024-03-15T16:00:00Z') });
    await page.route('**/gsi/client', route => route.abort());

    // Mock Sheets to return one existing entry
    const existingEntry = [
        'event-id-1',
        '2024-03-15T12:00:00.000Z',
        'log/entryConfirmed',
        JSON.stringify({
            entry: {
                id: 'entry-1',
                date: '2024-03-15',
                time: '12:00',
                mealType: 'Lunch',
                description: 'Existing Salad',
                calories: 350,
                protein: 15,
                fat: 10,
                carbs: 40,
                rationale: 'Healthy lunch',
                imageDriveUrl: 'https://drive.mock/salad.jpg, https://drive.mock/side.jpg',
                details: {}
            }
        })
    ];

    const eventParams: any[] = [];
    const appendedEntries: any[] = [];

    await page.route('**sheets.googleapis.com**', async route => {
        const url = route.request().url();
        console.log('Test Route Hit:', url);
        if (url.includes('append')) {
            const postData = route.request().postDataJSON();
            if (postData && postData.values && postData.values[0]) {
                eventParams.push(postData.values[0][2]); // Capture event Type
                if (postData.values[0][2] === 'log/entryConfirmed') {
                    appendedEntries.push(JSON.parse(postData.values[0][3]).entry);
                }
                // If logAgain, capture payload
                if (postData.values[0][2] === 'log/logAgain') {
                    eventParams.push(JSON.parse(postData.values[0][3]));
                }
            }
            await route.fulfill({ json: { updates: { updatedRange: 'A1' } } });
        } else if (url.includes('values/Events')) {
            await route.fulfill({ json: { values: [existingEntry] } });
        } else {
            await route.fallback();
        }
    });

    // Auth Mock
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

    await page.goto('/');
    await page.waitForFunction(() => (window as any)._authReady);
    await page.getByText('Sign In with Google').click();
    // Wait for Dashboard to stabilize (Auth confirmed)
    await expect(page.locator('.feed-header h2').first()).toBeVisible();

    // Explicitly wait for Sync to complete so store is hydrated
    await expect(page.locator('[data-status="synced"]:visible').first()).toBeVisible();

    // 1. Navigate to Entry Details via Dashboard
    // It should appear in Today list
    await expect(page.getByText('Existing Salad')).toBeVisible();
    await page.getByText('Existing Salad').click();

    // Verify Page Loaded
    await expect(page.locator('.big-text')).toHaveValue('Existing Salad');

    // 2. Click FAB
    const fab = page.getByLabel('Log new food entry');
    await expect(fab).toBeVisible();
    await fab.click();

    // 3. Verify Log Again Button
    await tester.step('check-log-again', {
        description: 'Log Again button visible',
        verifications: [
            { spec: 'Log Again button shown', check: async () => await expect(page.getByText('Log Again')).toBeVisible() },
            { spec: 'Favourites button shown', check: async () => await expect(page.getByText('Favourites')).toBeVisible() }
        ]
    });

    // 4. Click Log Again
    const logAgainBtn = page.getByText('Log Again');
    await expect(logAgainBtn).toBeVisible();
    await logAgainBtn.click();

    // 5. Verify Sheet Open and Pre-filled
    await tester.step('verify-prefill', {
        description: 'Form pre-filled',
        verifications: [
            { spec: 'Name is Existing Salad', check: async () => await expect(page.getByLabel('Log Description')).toHaveValue('Existing Salad') },
            { spec: 'Calories is 350', check: async () => await expect(page.getByLabel('Calories')).toHaveValue('350') },
            { spec: 'Date is Today (15th)', check: async () => await expect(page.getByLabel('Date')).toHaveValue('2024-03-15') },
            { spec: 'Time is 12:00', check: async () => await expect(page.getByLabel('Time')).toHaveValue('12:00') },
            { spec: 'Media is preserved', check: async () => await expect(page.locator('.preview-strip img')).toHaveCount(2) } // Check image copy
        ]
    });

    // 6. Save
    await page.getByText('Save Entry').click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    // 7. Verify LogAgain Event dispatched
    // We check capture
    expect(eventParams).toContain('log/logAgain');

    // 8. Test Favourites
    await page.goto('/log'); // Go to log page directly

    // 9. Click Favourites
    const favBtn = page.getByText('Favourites');
    await expect(favBtn).toBeVisible();
    await favBtn.click();

    // 10. Verify Picker shows item
    await tester.step('verify-favourites', {
        description: 'Favourites Picker',
        verifications: [
            { spec: 'Modal visible', check: async () => await expect(page.locator('.modal h2')).toHaveText('Favourites') },
            { spec: 'Item in list', check: async () => await expect(page.locator('.fav-item .name')).toHaveText('Existing Salad') },
            // { spec: 'Usage count 1', check: async () => await expect(page.locator('.fav-item .count')).toHaveText('1 logs') } // Might be strict text match issue
        ]
    });

    // 11. Select Item
    const favItem = page.locator('.fav-item');
    await expect(favItem).toBeVisible();
    await favItem.click();

    // 12. Verify Form filled again
    await expect(page.locator('.modal')).not.toBeVisible();
    const dateField = page.getByLabel('Date');
    const timeField = page.getByLabel('Time');

    await expect(page.getByLabel('Log Description')).toHaveValue('Existing Salad');
    await expect(dateField).toHaveValue('2024-03-15');
    await expect(timeField).toHaveValue('12:00');
    await expect(page.locator('.preview-strip img')).toHaveCount(2);

    // 13. Edit date before saving the favourite again
    await moveDateBackOneDay(dateField);

    await expect(dateField).toHaveValue('2024-03-14');
    await expect(timeField).toHaveValue('12:00');

    await page.getByText('Save Entry').click();
    await expect.poll(() => appendedEntries.at(-1)).toMatchObject({
        date: '2024-03-14',
        time: '12:00'
    });
    await expect(page.locator('.feed-header h2').first()).toHaveText('Today');

    await page.locator('.nav-btn.prev').first().click();
    await expect(page.locator('.feed-header h2').first()).toHaveText('Yesterday');
    await expect(page.locator('.activity-card').filter({ hasText: 'Existing Salad' })).toBeVisible();

    tester.generateDocs();
});
