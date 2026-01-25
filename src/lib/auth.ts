import { writable } from 'svelte/store';
import { base } from '$app/paths';

// @ts-ignore
export const GOOGLE_CLIENT_ID = (import.meta.env && import.meta.env.VITE_GOOGLE_OAUTH_ID) || undefined;
// @ts-ignore
export const GOOGLE_API_KEY = (import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) || undefined;
export const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
    'https://www.googleapis.com/auth/generative-language.retriever',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

export const authState = writable<{ token: string | null, ready: boolean }>({ token: null, ready: false });
export const userProfile = writable<UserProfile | null>(null);

// Simple wrapper around Google Identity Services (GIS)
// Assumes <script src="https://accounts.google.com/gsi/client" async defer></script> in app.html derived layout

// declare const google: any; // Removing implicit global to force window usage

let tokenClient: any;
let accessToken: string | null = null;
let refreshTimeoutId: any = null;

const TOKEN_KEY = 'food_log_access_token';
const EXPIRY_KEY = 'food_log_token_expiry';
const REFRESH_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

// Promise to track active refresh operation
let refreshPromise: Promise<string | null> | null = null;
let refreshResolver: ((token: string | null) => void) | null = null;

export function initializeAuth(onSuccess: (token: string) => void) {
    // 0. Check for redirect callback immediately
    if (handleRedirectCallback(onSuccess)) {
        return; // Stop other initialization if we just processed a redirect
    }

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
    try {
        tokenClient = g.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                handleTokenResponse(response, onSuccess);
            },
        });
    } catch (e) {
        console.error('[Auth] initTokenClient failed', e);
    }
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
        window.location.href = `${base}/`;
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

    // Resolve any pending refresh promise
    if (refreshResolver) {
        refreshResolver(accessToken);
        refreshResolver = null;
        refreshPromise = null;
    }

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
        refreshAuth();
    } else {
        scheduleRefresh(remainingSeconds, onSuccess);
    }
}

export function refreshAuth(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    if (tokenClient) {
        console.log('Refreshing auth token...');
        refreshPromise = new Promise((resolve) => {
            refreshResolver = resolve;
        });
        // prompt: '' is the key for silent refresh if user is already signed in
        tokenClient.requestAccessToken({ prompt: '', scope: SCOPES });
        return refreshPromise;
    }

    // Keep silent refresh using GIS if available, as it's cleaner for background work
    // But for interactive sign-in, use Redirect to avoid popup blockers
    return Promise.resolve(null);
}

export function signIn() {
    signInWithRedirect();
}

function signInWithRedirect() {
    // Use origin as the stable redirect URI to avoid needing to whitelist every path
    const redirectUri = window.location.origin + '/';
    // Pass current path in state to restore context after redirect
    const returnPath = window.location.pathname + window.location.search;

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: SCOPES,
        include_granted_scopes: 'true',
        state: returnPath
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    window.location.href = authUrl;
}

function handleRedirectCallback(onSuccess: (token: string) => void): boolean {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return false;

    // Parse the hash
    const params = new URLSearchParams(hash.substring(1)); // remove #
    const error = params.get('error');

    if (error) {
        console.error('[Auth] Redirect error:', error);
        // Clear hash to prevent loops or stale state
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return false;
    }

    const token = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const state = params.get('state');

    if (token) {
        console.log('[Auth] Successfully handled redirect callback');
        accessToken = token;

        // Calculate expiry
        const expiresInSeconds = expiresIn ? parseInt(expiresIn) : 3599;
        const expiryTime = Date.now() + (expiresInSeconds * 1000);

        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

        authState.update(s => ({ ...s, token: accessToken, ready: true }));
        (window as any)._authReady = true;

        onSuccess(accessToken);
        scheduleRefresh(expiresInSeconds, onSuccess);

        // Clear the hash from the URL
        // If state contains a valid relative path, restore it
        if (state && state.startsWith('/') && state !== 'pass-through-value') {
            history.replaceState(null, '', state);
        } else {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return true;
    }

    return false;
}


/**
 * Ensures a valid token is available, refreshing if necessary.
 * Use this for all API calls instead of getAccessToken().
 * @param forceInteractive If true, will trigger a full redirect flow if token is expired/buffering. Use this for user-initiated actions.
 */
export async function ensureValidToken(forceInteractive: boolean = false): Promise<string | null> {
    const storedExpiry = localStorage.getItem(EXPIRY_KEY);

    // If no token at all, return null
    if (!accessToken && !storedExpiry) return null;

    // Check expiry
    if (storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        const now = Date.now();
        const remainingSeconds = (expiryTime - now) / 1000;
        const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

        // If expired or within buffer
        if (remainingSeconds < REFRESH_BUFFER_SECONDS) {
            // Check if within 48h recoverable window
            if (now < expiryTime + FORTY_EIGHT_HOURS_MS) {
                console.log('[Auth] Token expired/buffered but within 48h grace period.');

                if (forceInteractive) {
                    console.log('[Auth] Force interactive refresh requested. Redirecting...');
                    signInWithRedirect();
                    return null; // Will redirect
                }

                console.log('[Auth] Attempting silent refresh...');
                return refreshAuth();
            } else {
                console.log('[Auth] Token expired > 48h ago. Forcing sign-out.');
                signOut();
                return null;
            }
        }
    }

    // Token is valid
    return accessToken;
}

/**
 * @deprecated Use ensureValidToken() for API calls to ensure freshness.
 */
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

export async function getUserInfo(): Promise<UserProfile | null> {
    const token = await ensureValidToken();
    if (!token) return null;

    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            userProfile.set(data);
            return data;
        }
    } catch (e) {
        console.error('Failed to fetch user info', e);
    }
    return null;
}
