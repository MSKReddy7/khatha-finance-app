# Google Drive Cloud Backup & Restore Setup Guide

Khatha Finance is an offline-first personal lending and borrowing application. This document details the architectural design, setup steps, security model, and operational procedures for the direct Google Drive cloud backup and restore system.

---

## 1. Architecture Overview

Khatha Finance uses a **direct client-to-cloud architecture** without any intermediate backend servers, functions, or external databases:

```
┌─────────────────────────────────────────────────────────────┐
│                 Khatha Finance Mobile App                   │
│                                                             │
│  ┌────────────────┐     ┌────────────────────────────────┐  │
│  │ Local SQLite   │ ──> │ Snapshot & SHA-256 Hash Engine │  │
│  │ (Primary Store)│     └────────────────────────────────┘  │
│  └────────────────┘                     │                   │
│                                         ▼                   │
│                         ┌────────────────────────────────┐  │
│                         │ Sequence Coordinator (Drive)   │  │
│                         └────────────────────────────────┘  │
│                                         │                   │
│                                         ▼                   │
│                         ┌────────────────────────────────┐  │
│                         │ Google Drive REST API v3       │  │
│                         └────────────────────────────────┘  │
└─────────────────────────────────────────┼───────────────────┘
                                          │ Direct HTTPS (PKCE OAuth 2.0)
                                          ▼
                ┌───────────────────────────────────────────────────┐
                │ Central Google Drive Account                      │
                │ Folder: "Khatha Finance Backups"                  │
                │                                                   │
                │ ├── _khatha_backup_sequence.json (manifest)       │
                │ ├── 101 Manoj Phone 2026-10-17_18-30-00.json     │
                │ ├── 102 Father Phone 2026-10-17_19-15-22.json    │
                │ └── 103 Shop Tablet 2026-10-17_20-00-10.json     │
                └───────────────────────────────────────────────────┘
```

- **Local-First**: The SQLite database (`khatha.db`) remains the primary, authoritative local store. The app functions completely without an internet connection.
- **Direct REST API**: All cloud interactions (folder creation, listing, conditional sequence manifest updates, multipart uploads, downloads, and deletions) are executed directly from the Expo client via Google Drive REST API v3.
- **Shared Access**: Multiple family devices (~10 devices) authorize access to the same dedicated central Google Drive account using Google OAuth 2.0.
- **Strict Replacement**: Restoring a cloud backup completely replaces the local database inside an exclusive SQLite transaction (never merges records), rolling back safely if any validation error occurs.

---

## 2. Google Cloud Setup Steps

Follow these steps in Google Cloud Console to enable Drive access for the app:

### Step 1: Create or Select a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your **dedicated family backup Google account** (or your developer account).
3. In the top navigation bar, click the project selector dropdown and click **New Project**.
4. Name the project (e.g., `Khatha-Finance-Backups`) and click **Create**.

### Step 2: Enable the Google Drive API
1. Navigate to **APIs & Services > Library**.
2. In the search box, search for **Google Drive API**.
3. Select **Google Drive API** and click **Enable**.

---

## 3. OAuth Consent Screen Configuration

1. In the left navigation, go to **APIs & Services > OAuth consent screen**.
2. Choose User Type:
   - **External**: Select this for standard personal Gmail / Google accounts.
3. Click **Create** and fill in the required fields:
   - **App name**: `Khatha Finance`
   - **User support email**: Your dedicated backup email address.
   - **Developer contact information**: Your email address.
4. Click **Save and Continue**.
5. **Scopes**:
   - Click **Add or Remove Scopes**.
   - Add:
     - `https://www.googleapis.com/auth/drive.file` (See Section 4 for scope details)
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Click **Update** and then **Save and Continue**.
6. **Test Users**:
   - While the app is in "Testing" publishing status, Google restricts OAuth access to designated test users.
   - Click **+ Add Users** and enter the email address of the **dedicated central backup Google account**.
   - Add any other family member emails if they use distinct accounts, though all devices are expected to authorize into the central backup account.
7. Click **Save and Continue**.

---

## 4. Required Scopes and Why They Are Needed

| Scope | Purpose | Sensitivity |
|---|---|---|
| `https://www.googleapis.com/auth/drive.file` | Per-file access to files and folders created or opened by the app. Used to create the dedicated folder `Khatha Finance Backups`, upload backups, update the sequence manifest, and delete expired backups. | Non-sensitive / Recommended |
| `https://www.googleapis.com/auth/userinfo.email` | Allows the app to retrieve and display the signed-in account email to alert the user if an unintended Google account is authorized. | Non-sensitive |
| `https://www.googleapis.com/auth/userinfo.profile` | Basic profile info (display name) to verify account ownership. | Non-sensitive |

> [!NOTE]
> **Why `drive.file` instead of full `drive`?**
> `https://www.googleapis.com/auth/drive.file` follows the principle of least privilege. It grants access ONLY to files and folders created by this app (identified by your Google Cloud Project). It does NOT grant access to the user's personal documents, photos, or spreadsheets stored elsewhere in Drive.
> 
> *Important Drive.file nuance*: Since all family devices will connect using the same OAuth Client ID belonging to the same Google Cloud Project, every installation has full read and write access to the backup folder and files created by any family device.

---

## 5. OAuth Client ID Creation (Single Client Setup)

Khatha Finance uses a single Google OAuth 2.0 Client ID for all operations (both in Expo Go and compiled Android APKs):

### Creating the OAuth 2.0 Client ID:

1. Go to **APIs & Services > Credentials** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Click **+ Create Credentials > OAuth client ID**.
3. Set **Application type**: **Desktop application**.
4. **Name**: `Khatha Finance Desktop Client`.
5. Click **Create**.
6. Download the JSON file (named `client_secret_*.json`) or copy your **Client ID** and **Client Secret**.

> [!NOTE]
> **Why Desktop application?**
> - It is the **only client type needed** for the entire project.
> - It allows the initial setup script to run a local loopback server (`http://localhost`) and securely exchange the OAuth authorization code for a long-lived `refreshToken`.
> - Both Expo Go and standalone Android APKs use this client to silently mint short-lived access tokens directly against Google's REST API without showing any Google login dialogs to users.
> - You do **NOT** need a Web Client or an Android Client in the Google Cloud Console.

---

## 6. Zero-Touch Mode: Single Source of Truth (`cloud-credentials.json`)

To allow all family members to use the app **without any "Sign in with Google" prompts, popups, or Google accounts on their devices**, credentials are read directly from `cloud-credentials.json` in the project root:

### Quick Setup with Token Generator:

1. Drop your downloaded `client_secret_*.json` file directly into the project root folder (or copy [`cloud-credentials.example.json`](../cloud-credentials.example.json) to `cloud-credentials.json` with only `clientId` and `clientSecret`).
   ```json
   {
     "clientId": "YOUR_GOOGLE_DESKTOP_CLIENT_ID.apps.googleusercontent.com",
     "clientSecret": "YOUR_GOOGLE_DESKTOP_CLIENT_SECRET"
   }
   ```
2. In your terminal, run:
   ```bash
   node src/scripts/get-refresh-token.js
   ```
   *(If credentials are not found in a file, the script will prompt you interactively in the terminal).*
3. The script will automatically open your default browser.
4. Log into the **dedicated central backup Google account** and approve Drive access.
5. Upon successful authorization, the script **automatically appends** `refreshToken` to **`cloud-credentials.json`**:
   ```json
   {
     "clientId": "YOUR_GOOGLE_DESKTOP_CLIENT_ID.apps.googleusercontent.com",
     "clientSecret": "YOUR_GOOGLE_DESKTOP_CLIENT_SECRET",
     "refreshToken": "1//0g...YOUR_REFRESH_TOKEN..."
   }
   ```
   *(Until authorization succeeds, no `refreshToken` key exists in the file).*

### What happens now:
- Every family member who opens the app is **instantly connected** to the central Drive backup folder.
- The app automatically refreshes access tokens in the background via Google's token endpoint.
- Backups happen automatically after transactions are created, with **zero user interaction**.

---

## 7. App Configuration in the UI

You can also view or update the credentials directly in the mobile app:
1. Open Khatha Finance and navigate to **Settings > ☁️ Google Drive Cloud Backup**.
2. Tap **Credentials** (or **Enter Credentials**).
3. Paste the Client ID, Client Secret, and Refresh Token.
4. Tap **Save**. The app will immediately activate cloud backup and fetch all available backups from the central Drive account!

---

## 8. Backup Triggers & Concurrency Serialization

Backups are executed and serialized through `CloudBackupManager`:

1. **Automatic Mutation Trigger**:
   - Every successful write to the SQLite database (`createBook`, `updateBook`, `deleteBook`, `archiveBook`, `restoreBook`, `createContact`, `updateContact`, `deleteContact`, `createTransaction`, `updateTransaction`, `deleteTransaction`, `restoreRawDatabaseData`) schedules a backup.
   - Rapid consecutive mutations are **debounced** by 3000ms (`MUTATION_DEBOUNCE_MS`) to bundle batch operations into a single upload.
   - If an operation fails or rolls back, a backup is NOT triggered.
2. **Launch & Resume Sync**:
   - When the app starts, it checks if any backup was marked `pending` (e.g. created while offline) and automatically retries.
3. **Manual Trigger**:
   - The user can tap **Back Up Now** on the Cloud Backup screen at any time.

---

## 9. Content-Hash Duplicate Detection

To prevent redundant uploads and save network bandwidth, the app employs **deterministic content hashing**:

1. **Consistent Snapshot**: Reads persistent table columns (`books`, `contacts`, `transactions`) sorted deterministically by primary key (`id ASC`). Transient / computed balances are excluded.
2. **Canonical Stringification**: Sorts all object keys alphabetically so serialization order is identical across platforms:
   ```json
   {"books":[{"created_at":"...","description":"","id":"b1","is_archived":false,"name":"A","updated_at":"..."}],"contacts":[...],"transactions":[...]}
   ```
3. **SHA-256 Digest**: Computes a SHA-256 hash of the canonical JSON string.
4. **Change Check**: Compares the hash with `last_backup_hash`. If identical, the upload is skipped with status `"No changes detected. Database is up to date."`

---

## 10. Sequential Global Backup ID Allocation & Guarantees

Every backup is saved with the filename pattern:
```
{sequential_backup_id} {backup_name} {timestamp}.json
Example: 104 Manoj Phone 2026-10-17_21-30-45.json
```

### Architectural Limitation & Concurrency Mechanism
Google Drive is an object storage service and does not offer a relational database atomic increment counter. However, Khatha Finance implements a client-side **optimistic concurrency control mechanism** using Google Drive HTTP ETags:

1. A coordination manifest `_khatha_backup_sequence.json` is maintained in the backup folder containing:
   ```json
   {
     "lastBackupId": 104,
     "lastUpdatedByDeviceId": "device-uuid-123",
     "lastUpdatedTime": "2026-10-17T21:30:45.000Z"
   }
   ```
2. When a device is ready to allocate an ID:
   - It lists all backup files in the folder to find the highest existing numeric ID prefix.
   - It reads `_khatha_backup_sequence.json` along with its HTTP `ETag`.
   - Candidate ID = `Math.max(highestFileId, manifest.lastBackupId) + 1`.
   - It sends a conditional `PATCH` request to update the manifest with the header `If-Match: <etag>`.
3. **Collision Detection & Retry**:
   - If another device updated the manifest concurrently, Google Drive returns `412 Precondition Failed`.
   - The device catches the 412, backs off exponentially, re-fetches the manifest and file list, and retries up to 3 times.
4. **Safety Guarantee**:
   - The system **never overwrites or deletes existing backups** if two devices ever allocate the same ID during an extreme race condition.
   - Backups are uniquely identified by their Google Drive `file.id` and UTC timestamp.

---

## 11. Per-Device Retention Rules

Khatha Finance retains the **latest 10 backups per device**, not 10 across the entire family folder:

- If **Device A** (e.g., Manoj Phone) uploads its 11th backup:
  - Backups belonging to Device A are sorted by creation time descending.
  - The 10 newest backups are preserved.
  - The oldest (11th) backup for Device A is deleted from Google Drive.
- Backups belonging to **Device B** (Father's Phone) or **Device C** are **never touched**.
- The newest backup is strictly protected and never deleted.
- Malformed or unrecognized files are ignored, not deleted.

---

## 12. Safe Restore and Atomic Rollback

Restoring a backup uses a **strict REPLACE** strategy:

1. User selects a backup from the available backups list and taps **Restore**.
2. A warning dialog is presented:
   > ⚠️ *This will completely REPLACE your current local database with this backup. Any local records created after this backup will be permanently overwritten.*
3. Upon explicit confirmation:
   - The JSON backup is downloaded from Google Drive.
   - The payload is thoroughly validated: schema version, table arrays, record types, positive amounts, and foreign key integrity (all contacts reference valid books; all transactions reference valid contacts).
   - If validation fails, the process aborts immediately. The local database is untouched.
   - An in-memory rollback snapshot of the existing local database is preserved.
   - The database replacement is executed inside an exclusive SQLite transaction:
     ```sql
     PRAGMA foreign_keys = OFF;
     DELETE FROM transactions;
     DELETE FROM contacts;
     DELETE FROM books;
     -- Insert all restored books, contacts, and transactions
     PRAGMA foreign_keys = ON;
     ```
   - If any insert fails, the transaction automatically rolls back.
   - After successful commit:
     - `last_backup_hash` is updated to match the restored state (preventing an immediate redundant upload).
     - Application Zustand stores are refreshed via `triggerRefresh()`. All screens immediately update.

---

## 13. Offline Handling and Retry Queue

- When offline, database mutations save to the local SQLite database normally without interruption.
- The app marks `khatha_cloud_backup_pending = true`.
- When connectivity resumes or the app launches, `CloudBackupManager` detects the pending flag, generates a fresh snapshot, and uploads the latest state.
- Intermediate rapid edits while offline are coalesced: only the latest database state is uploaded.

---

## 14. Expo Go vs Development Build Requirements

| Feature | Expo Go | Development Build (`npx expo run:android`) |
|---|---|---|
| SQLite Database (`expo-sqlite`) | Supported | Supported |
| SHA-256 Hashing (`expo-crypto`) | Supported | Supported |
| Secure Storage (`expo-secure-store`) | Supported | Supported (KeyStore / Keychain) |
| WebBrowser OAuth (`expo-auth-session`) | Uses Expo Auth Proxy (`https://auth.expo.io/@...`) | Uses custom scheme `khathafinance://oauthredirect` |
| Google Drive REST API | Supported | Supported |

---

## 15. Manual Testing Verification Checklist

Follow this checklist to test the integration:

- [ ] **Configure Client ID**: Paste your Google Cloud Client ID in Settings > Cloud Backup > Configure.
- [ ] **Sign In**: Tap "Sign in with Google" and authenticate with the central backup account.
- [ ] **Verify Device Name**: Set device name to "Test Phone 1" in Cloud Backup.
- [ ] **Create Record & Verify Backup**:
  - Create a new Book and Contact.
  - Return to Cloud Backup screen: verify backup `#1` appears with name `1 Test Phone 1 <timestamp>.json`.
- [ ] **Verify Duplicate Skipping**:
  - Tap "Back Up Now" without adding any records.
  - Verify message: *"No changes detected. Database is up to date."*
- [ ] **Test Second Device**:
  - Launch on a second device / emulator with device name "Test Phone 2".
  - Sign in with the same central Google account.
  - Verify backup list shows backup `#1` from "Test Phone 1".
  - Create a transaction on Device 2: verify backup `#2` is created with name `2 Test Phone 2 <timestamp>.json`.
- [ ] **Test Restore**:
  - On Device 1, select backup `#2` and confirm Restore.
  - Verify Device 1 now displays the exact state from backup `#2`.
- [ ] **Test Retention**:
  - Perform 11 backups on Device 1. Verify Device 1 keeps exactly its 10 newest backups and Device 2's backups are untouched.

---

## 16. Common Errors & Troubleshooting

| Error | Cause | Resolution |
|---|---|---|
| `Client ID is not configured` | No Google Cloud OAuth client ID entered. | Go to Cloud Backup > Configure and paste your OAuth 2.0 Client ID. |
| `redirect_uri_mismatch (400)` | Google Cloud OAuth Client does not have the redirect URI configured. | Add `https://auth.expo.io/@<username>/demo` (Expo Go) or `khathafinance://oauthredirect` (Dev build) to Authorized Redirect URIs in Google Cloud Console. |
| `access_denied (403)` | App is in "Testing" status and your account is not in Test Users. | In Google Cloud Console > OAuth consent screen > Test Users, add your Google email address. |
| `Foreign key violation during restore` | Backup file is corrupted or contains orphaned records. | The app safely rejected the file and preserved your local database. Use an earlier valid backup. |
