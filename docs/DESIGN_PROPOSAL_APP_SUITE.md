# Design Proposal: The "Personal Storage" App Suite

## Vision
To build a suite of focused, lightweight applications that provide a comprehensive view of personal health and life metrics, while maintaining absolute user privacy and data ownership. By utilizing the user's own Google Drive as the primary database, we eliminate the need for centralized servers and give users direct, auditable control over their information.

## The Foundation: "Local-First" with Cloud Storage

The current Food Tracker uses a unique architectural pattern:
1.  **Local State**: Fast, offline-capable UI using Redux and IndexedDB.
2.  **Cloud Sync**: An append-only event log stored in a Google Spreadsheet in the user's own Drive.
3.  **Privacy**: The app only requests access to its own files (`drive.file` scope).

This suite will expand this pattern into a multi-app ecosystem.

## Technical Architecture

### 1. Unified Event Log (The "Pulse")
Instead of each app having its own isolated database, all apps in the suite will write to a shared "Personal Stream" event log (Spreadsheet).

*   **Sheet Structure**: `eventId`, `timestamp`, `appId`, `eventType`, `payload` (JSON).
*   **Benefits**:
    *   **Atomicity**: Events from different apps are naturally ordered by time.
    *   **Awareness**: Any app in the suite can read the stream to see what other apps have logged (e.g., the Food app can see a "Weight Logged" event and display it on its dashboard).
    *   **Portability**: One file contains the user's entire life stream.

### 2. App Discovery & Folder Structure
We will standardize a folder structure in Google Drive:
```
/PersonalStream (Root Folder)
  ├── PersonalStreamLog (The Master Spreadsheet)
  ├── /Food (Attachments like food photos)
  ├── /Recipes (Recipe images/data)
  ├── /Meds (Prescription scans)
```
Apps discover the suite by searching for the root folder or the tagged Master Spreadsheet.

### 3. Shared Library (`@personal-stream/core`)
To ensure consistency, we will extract the `sync-manager`, `auth`, and `sheets` logic into a shared library used by all apps in the suite.

## The App Suite Integration Matrix

| App | Primary Events | Integration Point |
| :--- | :--- | :--- |
| **Food** | `food_consumed`, `photo_uploaded` | Reads `recipe_used` from Recipes. |
| **Water** | `water_drank` | Dashboard shows water vs. food intake. |
| **Weight** | `weight_entry` | Food app shows weight trend on log screen. |
| **Recipes** | `recipe_created` | Food app uses recipe payload to auto-log macros. |
| **Meal Planning**| `meal_planned` | Populates "Planned" section in Food app. |
| **Grocery** | `item_added`, `item_bought` | Auto-adds ingredients from Meal Plan. |
| **Meds/Moods** | `med_taken`, `mood_logged` | Correlates mood/symptoms with food/water intake. |

## UI/UX Design

### 1. The "Suite Dashboard"
A unified "Lifestream" view that aggregates events into a vertical timeline.
*   **Contextual Cards**: A food log entry followed by a weight entry, showing the correlation.
*   **Quick Actions**: Floating action button that lets you log "Water", "Food", or "Mood" without switching apps.

### 2. Deep Linking & App Switching
Each app remains small and focused.
*   If you tap a "Recipe" in the Food app, it deep-links you to the Recipes app for full details.
*   Standardized navigation bar at the bottom to jump between suite members.

## Privacy & Legal Framework

### 1. The "Transparency Promise"
Because the data is in a Spreadsheet, the "Privacy Policy" is self-evident: "Open your Google Drive to see exactly what we know."

### 2. Zero-Knowledge Infrastructure
*   No developer-owned servers.
*   No third-party analytics (unless opted-in and anonymized).
*   Encryption: Optional client-side encryption of the `payload` field for ultra-sensitive data (e.g., Meds).

### 3. Data Ownership
Users can "Export" their data by simply downloading the Spreadsheet. They can "Delete" their data by deleting the folder in Drive. No "Request to Delete" emails required.
