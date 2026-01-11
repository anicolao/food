export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/photoslibrary.readonly'
].join(' ');

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

// Simple wrapper around Google Identity Services (GIS)
// Assumes <script src="https://accounts.google.com/gsi/client" async defer></script> in app.html derived layout

declare const google: any;

let tokenClient: any;
let accessToken: string | null = null;

export function initializeAuth(onSuccess: (token: string) => void) {
    if (typeof google === 'undefined') return;

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
            if (response.access_token) {
                accessToken = response.access_token as string;
                onSuccess(accessToken);
            }
        },
    });
}

export function signIn() {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        console.error('Auth not initialized');
    }
}

export function getAccessToken() {
    return accessToken;
}

export function signOut() {
    accessToken = null;
    // Optional: Revoke if needed, but for MVP client-side clear is enough.
}
