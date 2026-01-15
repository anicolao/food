import { writable } from 'svelte/store';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_ID;
export const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
    'https://www.googleapis.com/auth/generative-language.retriever'
].join(' ');

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

export const authState = writable<{ token: string | null, ready: boolean }>({ token: null, ready: false });

// Simple wrapper around Google Identity Services (GIS)
// Assumes <script src="https://accounts.google.com/gsi/client" async defer></script> in app.html derived layout

// declare const google: any; // Removing implicit global to force window usage

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
    let shouldTrySilentRefresh = false;

    // Setup visibility listener to catch expiry when waking from sleep
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAndRefreshIfNeeded(onSuccess);
        }
    });

    if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        const now = Date.now();

        // Logic for "Much longer" local expiry:
        // Users want to stay logged in for ~48h even if the actual token expires in 1h.
        // If the token is expired but within 48h of its original expiry, we consider the session "recoverable" via silent refresh.
        // If it's been > 48h, we force a full sign-in.

        const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

        if (now < expiryTime) {
            accessToken = storedToken;
            authState.update(s => ({ ...s, token: storedToken }));
            onSuccess(accessToken);
            (window as any)._authReady = true;
            authState.update(s => ({ ...s, ready: true }));

            // Schedule refresh based on remaining time
            const remainingSeconds = (expiryTime - now) / 1000;
            scheduleRefresh(remainingSeconds, onSuccess);
        } else if (now < expiryTime + FORTY_EIGHT_HOURS_MS) {
            // Expired, but within the 48h "recoverable" window.
            console.log('[Auth] Token expired but within 48h grace period. Attempting silent refresh...');
            shouldTrySilentRefresh = true;
            // Still signal ready so UI doesn't hang, but not authenticated yet
            (window as any)._authReady = true;
            authState.update(s => ({ ...s, ready: true }));
        } else {
            console.log('[Auth] Session expired > 48h ago. Requiring full sign-in.');
            // Do nothing (don't set ready=true with token), just let it fall through to unauthenticated state.
            signOut();
            (window as any)._authReady = true;
            authState.update(s => ({ ...s, ready: true }));
        }
    }

    // 2. Poll for Google Script (max 5s)
    let attempts = 0;
    const interval = setInterval(() => {
        const g = (window as any).google;
        if (typeof g !== 'undefined' && g.accounts) {
            clearInterval(interval);
            console.log('[Auth] Google Identity Services found');
            initClient(onSuccess);
            if (shouldTrySilentRefresh) {
                refreshAuth();
            }
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
    const g = (window as any).google;
    tokenClient = g.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
            handleTokenResponse(response, onSuccess);
        },
    });
    // Signal tests that client is initialized
    (window as any)._authReady = true;
    authState.update(s => ({ ...s, ready: true }));
}

function handleTokenResponse(response: any, onSuccess: (token: string) => void) {
    if (response.error) {
        console.error('[Auth] Token request failed:', response.error);
        signOut();
        // Redirect to signin if silent refresh fails
        // Use window.location as we are in a lib file and might not have router active or this is the safest full reset
        window.location.href = '/';
        return;
    }

    if (response.scope) {
        console.log('[Auth] Granted scopes:', response.scope);
    }
    accessToken = response.access_token as string;
    const expiresInSeconds = response.expires_in || 3599; // Default to 1h
    const expiryTime = Date.now() + (expiresInSeconds * 1000);

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

    authState.update(s => ({ ...s, token: accessToken }));
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
        } else {
            // If we have an expiry but no access token (e.g. from expired state), try refresh
            refreshAuth();
        }
    } else {
        // We are fine, but ensure scheduler is running if it was lost (e.g. reload?)
        scheduleRefresh(remainingSeconds, onSuccess);
    }
}

export function refreshAuth() {
    if (tokenClient) {
        console.log('Refreshing auth token...');
        // prompt: '' is the key for silent refresh if user is already signed in
        tokenClient.requestAccessToken({ prompt: '', scope: SCOPES });
    }
}

export function signIn() {
    if (tokenClient) {
        // Force account selection to ensure fresh consent and correct account
        tokenClient.requestAccessToken({ prompt: 'select_account', scope: SCOPES });
    } else {
        console.error('Auth not initialized yet');
    }
}

export function getAccessToken() {
    return accessToken;
}

export function signOut() {
    const tokenToRevoke = accessToken;
    accessToken = null;
    if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
        refreshTimeoutId = null;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    authState.update(s => ({ ...s, token: null }));
    const g = (window as any).google;
    if (typeof g !== 'undefined' && g.accounts && tokenToRevoke) {
        g.accounts.oauth2.revoke(tokenToRevoke, () => { });
    }
}
