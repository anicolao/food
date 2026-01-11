import { getAccessToken } from './auth';

// --- Sheets API ---

export async function appendRow(spreadsheetId: string, sheetName: string, values: any[]) {
    const token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const range = `${sheetName}!A1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [values]
        })
    });

    if (!response.ok) {
        throw new Error(`Sheets API Error: ${response.statusText}`);
    }

    return await response.json();
}

export async function fetchRows(spreadsheetId: string, sheetName: string): Promise<any[]> {
    const token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Sheets API Error: ${response.statusText}`);

    const data = await response.json();
    return data.values || [];
}

// --- Drive API ---

export async function uploadImage(file: Blob, filename: string, folderId?: string) {
    const token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const metadata: any = {
        name: filename,
        mimeType: file.type
    };
    if (folderId) {
        metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: form
    });

    if (!response.ok) {
        throw new Error(`Drive API Error: ${response.statusText}`);
    }

    return await response.json(); // Returns file object with ID
}
