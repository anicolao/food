import { ensureValidToken } from './auth';

const imageCache = new Map<string, string>();

export async function resolveDriveImage(url: string): Promise<string> {
    if (!url) return '';
    if (imageCache.has(url)) return imageCache.get(url)!;

    // Check if it's a Drive URL we need to fetch authenticated
    // Pattern 1: constructed thumbnail link
    let fileId = '';
    const match1 = url.match(/id=([^&]+)/);
    if (match1) fileId = match1[1];

    // Pattern 2: direct file link (if we ever use that)
    // const match2 = url.match(/\/file\/d\/([^/]+)/);

    if (fileId) {
        const token = await ensureValidToken();
        if (token) {
            try {
                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    imageCache.set(url, blobUrl);
                    return blobUrl;
                }
            } catch (e) {
                console.error('Failed to fetch authenticated image', e);
            }
        }
    }

    // Fallback: return original (might work if public or cached) or failure
    return url;
}
