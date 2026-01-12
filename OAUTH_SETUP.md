# OAuth Configuration Setup

This document explains how to configure OAuth credentials for the deployed application.

## Overview

The application requires Google OAuth credentials to authenticate users and access Google services (Drive, Sheets, Photos, Gemini AI). These credentials are provided at deployment time through GitHub Secrets, not at build time, to ensure they can be updated without rebuilding the application.

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### 1. GOOGLE_DRIVE_CLIENT_ID (Required)
The OAuth 2.0 Client ID for Google Drive and authentication.

**How to obtain:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the following APIs:
   - Google Drive API
   - Google Sheets API
   - Google Photos Library API
   - Generative Language API (Gemini)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized JavaScript origins:
   - `https://anicolao.github.io`
7. Add authorized redirect URIs:
   - `https://anicolao.github.io/food/`
8. Copy the Client ID

### 2. GOOGLE_API_KEY (Required)
API key for Google Gemini AI API.

**How to obtain:**
1. In the same Google Cloud project
2. Go to "Credentials" → "Create Credentials" → "API Key"
3. Restrict the key to only the "Generative Language API"
4. Copy the API Key

### 3. GOOGLE_DRIVE_FOLDER_ID (Optional)
A default folder ID where the app stores data.

### 4. GOOGLE_PHOTOS_CLIENT_ID (Optional)
Separate OAuth client ID for Google Photos if needed.

## Setting Up Secrets in GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name and value

Example:
```
Name: GOOGLE_DRIVE_CLIENT_ID
Value: 123456789-abcdefghijklmnop.apps.googleusercontent.com
```

## How It Works

1. **Build Time**: The application is built with placeholder values
2. **Deployment Time**: The `inject-config.sh` script runs after the build
3. **Runtime**: The `static/config.js` file is replaced with actual secret values
4. **Client Side**: The application loads `config.js` and uses the values for OAuth

## Security Considerations

- Secrets are stored securely in GitHub Secrets (encrypted at rest)
- Secrets are only accessible during GitHub Actions workflow execution
- The OAuth Client ID is a public identifier (not a secret), but storing it in GitHub Secrets allows centralized management
- The API key should be restricted to specific APIs and referrer URLs in Google Cloud Console

## Local Development

For local development, create a `.env` file in the project root:

```env
VITE_GOOGLE_DRIVE_CLIENT_ID=your-client-id
VITE_GOOGLE_API_KEY=your-api-key
VITE_GOOGLE_DRIVE_FOLDER_ID=your-folder-id
VITE_GOOGLE_PHOTOS_CLIENT_ID=your-photos-client-id
```

The application will use these environment variables during local development and fall back to the runtime config in production.

## Verifying the Configuration

After deployment:

1. Visit the deployed application
2. Open browser DevTools → Console
3. Type `window.APP_CONFIG` and press Enter
4. Verify that the configuration values are present (not null)
5. Try signing in with your Google account

If the configuration is missing or incorrect:
- Check that the GitHub Secrets are set correctly
- Review the GitHub Actions workflow logs for errors
- Verify the `inject-config.sh` script ran successfully

## Updating Credentials

To update OAuth credentials:

1. Update the secret values in GitHub repository settings
2. Trigger a new deployment (push to main or manually trigger workflow)
3. The new credentials will be injected into the deployed application

No code changes or rebuilding is necessary to update credentials.
