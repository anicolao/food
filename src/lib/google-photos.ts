import { getAccessToken } from './auth';

export interface PickerSession {
    id: string;
    pickerUri: string;
    mediaItemsSet: boolean;
    pollingPolicy?: {
        pollInterval: string; // e.g., "5s"
        pollDuration: string;
    }
}

export interface MediaItem {
    id: string;
    baseUrl: string;
    mimeType: string;
    filename: string;
}

export async function createPickerSession(): Promise<PickerSession> {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(
        `https://photospicker.googleapis.com/v1/sessions`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        },
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create picker session: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

export async function pollPickerSession(sessionId: string): Promise<PickerSession> {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(
        `https://photospicker.googleapis.com/v1/sessions/${sessionId}`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to poll session: ${response.statusText}`);
    }
    return await response.json();
}

export async function listSessionMediaItems(sessionId: string): Promise<MediaItem[]> {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(
        `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=100`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to list media items: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.mediaItems) return [];

    // Map to simplified structure
    return data.mediaItems.map((item: any) => ({
        id: item.id,
        baseUrl: item.mediaFile?.baseUrl || "",
        mimeType: item.mediaFile?.mimeType || "",
        filename: item.mediaFile?.filename || "",
    }));
}
