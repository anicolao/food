
import type { Page } from '@playwright/test';

/**
 * Mocks the Google Drive & Sheets API to support robust metadata discovery and generic operations.
 * 
 * Handled Drive Endpoints:
 * - Search by `appProperties` (Robust Discovery)
 * - Search by `FoodLog` folder
 * - Search by Legacy Name
 * - Get Metadata / Patch File (files/{id})
 * - Create File
 * 
 * Handled Sheets Endpoints:
 * - batchUpdate (Create Sheet)
 * - values/Events (Append / Get) - Returns empty by default
 */
export async function mockDriveAPI(page: Page) {
    // 1. Mock Drive API
    await page.route('**/drive/v3/**', async route => {
        const url = route.request().url();
        const method = route.request().method();

        // 1. Robust Discovery: Search by Tag
        if (url.includes('appProperties')) {
            await route.fulfill({
                json: {
                    files: [{
                        id: 'mock-sheet-id',
                        name: 'Food Log Data',
                        modifiedTime: '2024-01-01T12:00:00Z',
                        appProperties: { type: 'food_tracker_db' }
                    }]
                }
            });
            return;
        }

        // 2. Folder Search
        if (url.includes('FoodLog')) {
            await route.fulfill({ json: { files: [{ id: 'mock-folder-id', name: 'FoodLog' }] } });
            return;
        }

        // 3. Turn off Legacy Search
        if (url.includes('TheFoodTrackerEventLog')) {
            await route.fulfill({ json: { files: [{ id: 'mock-sheet-id', name: 'TheFoodTrackerEventLog' }] } });
            return;
        }

        // 4. Single File Operations
        if (url.match(/\/files\/[^/?]+(\?|$)/)) {
            if (method === 'PATCH') {
                const body = route.request().postDataJSON();
                await route.fulfill({
                    json: {
                        id: 'mock-sheet-id',
                        name: body.name || 'Renamed File',
                        appProperties: { type: 'food_tracker_db' }
                    }
                });
            } else {
                await route.fulfill({
                    json: {
                        id: 'mock-sheet-id',
                        name: 'Food Log Data',
                        mimeType: 'application/vnd.google-apps.spreadsheet'
                    }
                });
            }
            return;
        }

        // 5. Upload (Multipart or regular)
        if (url.includes('/upload/drive/v3/files')) {
            await route.fulfill({
                status: 200,
                json: {
                    id: 'mock-uploaded-file-id',
                    name: 'Uploaded File',
                    // Use a local internal image so it definitely loads in screenshots
                    thumbnailLink: 'http://localhost:5174/images/icon-status-synced.png',
                    webViewLink: 'http://localhost:5174/images/icon-status-synced.png'
                }
            });
            return;
        }

        // 6. Generic Creation (POST to files)
        if (method === 'POST' && url.includes('/files')) {
            await route.fulfill({ json: { id: 'mock-sheet-id', name: 'New Database' } });
            return;
        }

        await route.fulfill({ json: { files: [] } });
    });

    // 2. Mock Sheets API
    await page.route('**sheets.googleapis.com**', async route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('batchUpdate')) {
            await route.fulfill({ json: { replies: [{ addSheet: { properties: { title: 'Events' } } }] } });
            return;
        }

        if (url.includes('values/Events')) {
            if (method === 'POST') {
                await route.fulfill({ json: { updates: { updatedRange: 'Events!A1' } } });
            } else {
                // Return empty values by default
                await route.fulfill({ json: { values: [] } });
            }
            return;
        }

        // Catch-all for other sheets calls
        await route.fulfill({ json: {} });
    });

    // 3. Mock Photos Picker API
    await page.route('**photospicker.googleapis.com**', async route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('sessions')) {
            if (!url.includes('mediaItems')) {
                // Session Management
                if (method === 'POST') {
                    // Create Session
                    await route.fulfill({ json: { id: 'sess-1', pickerUri: 'http://mock-picker.com' } });
                } else {
                    // Poll Session (GET)
                    // Default to 'mediaItemsSet: true' to prevent hanging, or false?
                    // 004 sets it to true. 002 sets it to false.
                    // Default to false (polling) to mimic real behavior, but tests might timeout?
                    // Let's check 005.
                    await route.fulfill({ json: { mediaItemsSet: false } });
                }
                return;
            }
        }

        if (url.includes('mediaItems')) {
            // List Items
            await route.fulfill({
                json: {
                    mediaItems: [{
                        id: 'item-1',
                        mediaFile: {
                            baseUrl: 'https://lh3.googleusercontent.com/picker-img',
                            mimeType: 'image/jpeg',
                            filename: 'picked.jpg'
                        }
                    }]
                }
            });
            return;
        }

        await route.fulfill({ json: {} });
    });

    // 4. Mock Google User Content (Images)
    await page.route('**lh3.googleusercontent.com**', async route => {
        // Return a placeholder image
        const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwftQAAAABJRU5ErkJggg==', 'base64');
        await route.fulfill({ body: buffer, contentType: 'image/png' });
    });
}
