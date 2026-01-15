import { ensureValidToken } from './auth';

// --- Sheets API ---
// --- Sheets API ---

// Helper: Search or create folder
async function findOrCreateFolder(name: string): Promise<string> {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    // 1. Search
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`;
    const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!searchRes.ok) throw new Error('Drive Search Failed');
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id; // Return existing
    }

    // 2. Create
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    if (!createRes.ok) throw new Error('Folder Creation Failed');
    const createData = await createRes.json();
    return createData.id;
}

// Helper: Search or create file inside folder
async function findOrCreateFile(name: string, parentId: string, mimeType: string): Promise<string> {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    // 1. Search
    const q = `name='${name}' and '${parentId}' in parents and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`;
    const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!searchRes.ok) throw new Error('File Search Failed');
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // 2. Create
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            mimeType,
            parents: [parentId]
        })
    });
    if (!createRes.ok) throw new Error('File Creation Failed');
    const createData = await createRes.json();
    return createData.id;
}

export async function ensureDataStructures() {
    console.log('Ensuring data structures...');
    const folderId = await findOrCreateFolder('FoodLog');
    console.log('Folder ID:', folderId);

    const spreadsheetId = await findOrCreateFile('TheFoodTrackerEventLog', folderId, 'application/vnd.google-apps.spreadsheet');
    console.log('Spreadsheet ID:', spreadsheetId);

    // Ensure "Events" tab exists (default is Sheet1)
    await ensureSheetExists(spreadsheetId, 'Events');

    return { folderId, spreadsheetId };
}

async function ensureSheetExists(spreadsheetId: string, title: string) {
    const token = await ensureValidToken();
    if (!token) return; // Should be checked earlier

    try {
        // 1. Get metadata
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!metaRes.ok) return; // Fail silently or log?
        const meta = await metaRes.json();

        // 2. Check if exists
        if (meta.sheets?.some((s: any) => s.properties.title === title)) {
            return;
        }

        // 3. Create if missing
        console.log(`Creating sheet '${title}'...`);
        const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [{ addSheet: { properties: { title } } }]
            })
        });
        if (!updateRes.ok) console.error('Failed to create sheet', await updateRes.text());

    } catch (e) {
        console.error('Error ensuring sheet exists', e);
    }
}

export async function appendRow(spreadsheetId: string, sheetName: string, values: any[]) {
    const token = await ensureValidToken();
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
    const token = await ensureValidToken();
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
    const token = await ensureValidToken();
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

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink';

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
