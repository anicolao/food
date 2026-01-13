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
let refreshTimeoutId: any = null;

const TOKEN_KEY = 'food_log_access_token';
const EXPIRY_KEY = 'food_log_token_expiry';
const REFRESH_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

export function initializeAuth(onSuccess: (token: string) => void) {
    // 1. Try to restore from localStorage first
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(EXPIRY_KEY);

    // Setup visibility listener to catch expiry when waking from sleep
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAndRefreshIfNeeded(onSuccess);
        }
    });

    if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        if (Date.now() < expiryTime) {
            accessToken = storedToken;
            onSuccess(accessToken);
            (window as any)._authReady = true;

            // Schedule refresh based on remaining time
            const remainingSeconds = (expiryTime - Date.now()) / 1000;
            scheduleRefresh(remainingSeconds, onSuccess);
        } else {
            // Expired
            signOut();
            // Still ready, just not authenticated
            (window as any)._authReady = true;
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
                handleTokenResponse(response, onSuccess);
            }
        },
    });
    // Signal tests that client is initialized
    (window as any)._authReady = true;
}

function handleTokenResponse(response: any, onSuccess: (token: string) => void) {
    accessToken = response.access_token as string;
    const expiresInSeconds = response.expires_in || 3599; // Default to 1h
    const expiryTime = Date.now() + (expiresInSeconds * 1000);

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

    onSuccess(accessToken);
    scheduleRefresh(expiresInSeconds, onSuccess);
}

function scheduleRefresh(expiresInSeconds: number, onSuccess: (token: string) => void) {
    if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
        refreshTimeoutId = null;
    }

    const timeTillRefresh = (expiresInSeconds - REFRESH_BUFFER_SECONDS) * 1000;

    if (timeTillRefresh <= 0) {
        // Expiring very soon or already into buffer zone, refresh immediately
        refreshAuth();
    } else {
        refreshTimeoutId = setTimeout(() => {
            refreshAuth();
        }, timeTillRefresh);
    }
}

function checkAndRefreshIfNeeded(onSuccess: (token: string) => void) {
    const storedExpiry = localStorage.getItem(EXPIRY_KEY);
    if (!storedExpiry) return;

    const expiryTime = parseInt(storedExpiry);
    const remainingSeconds = (expiryTime - Date.now()) / 1000;

    if (remainingSeconds < REFRESH_BUFFER_SECONDS) {
        // We are within the buffer window or expired
        if (accessToken) {
            refreshAuth();
        }
    } else {
        // We are fine, but ensure scheduler is running if it was lost (e.g. reload?)
        // Actually, initializeAuth calls scheduleRefresh, so likely fine.
        // But if we just woke up, we might need to adjust the timer if it drifted?
        // JS timers usually pause/delay on sleep.
        // Re-scheduling is safe.
        scheduleRefresh(remainingSeconds, onSuccess);
    }
}

export function refreshAuth() {
    if (tokenClient) {
        console.log('Refreshing auth token...');
        // prompt: '' is the key for silent refresh if user is already signed in
        tokenClient.requestAccessToken({ prompt: '' });
    }
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
    if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
        refreshTimeoutId = null;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.oauth2.revoke(accessToken, () => { });
    }
}
