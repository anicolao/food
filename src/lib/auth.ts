export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_ID;
export const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/photoslibrary.readonly',
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
    'https://www.googleapis.com/auth/generative-language.retriever'
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

const TOKEN_KEY = 'food_log_access_token';
const EXPIRY_KEY = 'food_log_token_expiry';

export function initializeAuth(onSuccess: (token: string) => void) {
    // 1. Try to restore from localStorage first
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(EXPIRY_KEY);

    if (storedToken && storedExpiry) {
        if (Date.now() < parseInt(storedExpiry)) {
            accessToken = storedToken;
            onSuccess(accessToken);
        } else {
            // Expired
            signOut();
        }
    }

    // 2. Poll for Google Script (max 5s)
    let attempts = 0;
    const interval = setInterval(() => {
        if (typeof google !== 'undefined') {
            clearInterval(interval);
            initClient(onSuccess);
        } else {
            attempts++;
            if (attempts > 50) { // 5 seconds
                clearInterval(interval);
                console.error('Google Identity Services script failed to load.');
            }
        }
    }, 100);
}

function initClient(onSuccess: (token: string) => void) {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
            if (response.access_token) {
                accessToken = response.access_token as string;
                const expiresInSeconds = response.expires_in || 3599; // Default to 1h
                const expiryTime = Date.now() + (expiresInSeconds * 1000);

                localStorage.setItem(TOKEN_KEY, accessToken);
                localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

                onSuccess(accessToken);
            }
        },
    });
}

export function signIn() {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        console.error('Auth not initialized yet');
    }
}

export function getAccessToken() {
    return accessToken;
}

export function signOut() {
    accessToken = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.oauth2.revoke(accessToken, () => { });
    }
}
