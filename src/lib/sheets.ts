import { ensureValidToken } from './auth';

// --- Sheets API ---
// --- Sheets API ---

// --- Sheets API ---

export interface GoogleDriveFile {
    id: string;
    name: string;
    webViewLink: string;
    thumbnailLink?: string;
}

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



// Robust Discovery Implementation

// 1. Tag a file with app properties
async function tagDatabaseFile(fileId: string) {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            appProperties: { type: 'food_tracker_db' }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to tag file: ${response.statusText}`);
    }
}

// 2. Find all database files by tag, sorted by time
export async function findDatabaseFiles(parentId?: string) {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    let q = "appProperties has { key='type' and value='food_tracker_db' } and trashed=false";
    if (parentId) {
        q += ` and '${parentId}' in parents`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,createdTime)`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to list database files');
    const data = await response.json();
    return data.files || [];
}

// 3. New Creation Logic with Tagging
async function createDatabaseFile(name: string, parentId: string) {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    const url = 'https://www.googleapis.com/drive/v3/files';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [parentId],
            appProperties: { type: 'food_tracker_db' }
        })
    });

    if (!response.ok) throw new Error('File Creation Failed');
    const data = await response.json();
    return data.id;
}

// Modified Discovery Logic
export async function ensureDataStructures() {

    const folderId = await findOrCreateFolder('FoodLog');


    // Step 1: Search by Tag (The new, robust way)
    const dbFiles = await findDatabaseFiles(folderId);

    let spreadsheetId;

    if (dbFiles.length > 0) {
        // Found tagged files! Use the most recently modified one.

        spreadsheetId = dbFiles[0].id;
    } else {
        // Step 2: Fallback - Search by Legacy Name (The old way)


        // Use existing (but modified) search logic inline here or call a helper
        const legacyName = 'TheFoodTrackerEventLog';
        const token = await ensureValidToken();
        const q = `name='${legacyName}' and '${folderId}' in parents and trashed=false`;
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            // Found legacy file! Migration time.

            spreadsheetId = searchData.files[0].id;
            await tagDatabaseFile(spreadsheetId);
        } else {
            // Step 3: Create New (Clean Slate)

            spreadsheetId = await createDatabaseFile('TheFoodTrackerEventLog', folderId);
        }
    }



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

export async function appendRows(spreadsheetId: string, sheetName: string, rows: any[][]) {
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
            values: rows
        })
    });

    if (!response.ok) {
        throw new Error(`Sheets API Error: ${response.statusText}`);
    }

    return await response.json();
}

export async function fetchRows(spreadsheetId: string, sheetName: string, startRow?: number): Promise<any[]> {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    const range = startRow ? `${sheetName}!A${startRow}:Z` : `${sheetName}!A:Z`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(JSON.stringify({
            status: response.status,
            message: response.statusText,
            body: await response.text()
        }));
    }

    const data = await response.json();
    return data.values || [];
}

// --- Drive API ---

export async function uploadImage(file: Blob, filename: string, folderId?: string): Promise<GoogleDriveFile> {
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

export async function getFileMetadata(fileId: string) {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Drive API Error: ${response.statusText}`);
    }

    return await response.json();
}

export async function renameFile(fileId: string, newName: string) {
    const token = await ensureValidToken();
    if (!token) throw new Error('Not authenticated');

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
        throw new Error(`Drive API Error: ${response.statusText}`);
    }

    return await response.json();
}
