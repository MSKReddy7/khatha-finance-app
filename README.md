# Khatha Finance App

A production-ready, offline-first personal financial ledger mobile application built with React Native and Expo. Khatha Finance helps individuals, families, and business owners record money lent and borrowed, manage multi-party books and contacts, track net balances, and automatically synchronize backups to Google Drive across multiple devices with zero friction.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Google Drive Cloud Backup (Zero-Touch)](#google-drive-cloud-backup-zero-touch)
- [Building Standalone APK](#building-standalone-apk)
- [Database & Offline-First Design](#database--offline-first-design)
- [Localization & Theming](#localization--theming)
- [Documentation & Policies](#documentation--policies)
- [License](#license)

---

## Overview

Khatha Finance provides a fast, offline-first double-entry style ledger tracking workflow:

- **Books:** Organize transactions into books (e.g., Personal, Family, Business, Rental).
- **Contacts:** Maintain customer/contact records with contact details, notes, and live balances.
- **Transactions:** Record amounts given or received with custom timestamps, notes, and audit trails.
- **Reporting:** Real-time dashboards, top debtors/creditors, and net position summaries.
- **Cloud Backup:** Automatic, zero-touch sync to Google Drive without requiring user login prompts on family devices.

---

## Features

### 📒 Book & Contact Management
- Create, edit, search, filter, and archive multiple books.
- Add contacts under specific books with phone numbers, addresses, and transaction notes.
- Instant net balance calculation (You will give / You will receive).

### 💸 Transaction Tracking
- Quick entry for **GAVE** (Debit) and **RECEIVED** (Credit).
- Timestamping, notes, and detailed transaction history per contact.
- Instant recalculation of book totals and dashboard analytics.

### ☁️ Automated Google Drive Cloud Backup (Zero-Touch)
- **Direct REST API v3:** No intermediate third-party servers; direct device-to-Google Drive communication.
- **Zero-Touch Background Mode:** All family devices sync to a single central Google Drive without requiring individual Google logins.
- **SHA-256 Change Detection:** Deterministic hashing prevents redundant uploads when no data changes.
- **Sequence Coordinator:** Global sequential ID allocation (`{id} {deviceName} {timestamp}.json`) via an optimistic concurrency manifest (`_khatha_backup_sequence.json`).
- **Device-Aware Retention:** Keeps the 10 most recent backups per device while protecting other devices' data.
- **Atomic Restore & Rollback:** Safe SQLite restoration with automatic rollback safeguards.

### 🌐 Localization & Customization
- **Multi-Language:** English (`en`), Hindi (`hi`), and Telugu (`te`).
- **Adaptive Theme:** Light, Dark, and System modes with customized color palettes.

---

## Tech Stack

| Component | Technology | Version |
| :--- | :--- | :--- |
| **Framework** | Expo SDK / React Native | SDK 57 / React Native 0.86.3 |
| **Language** | TypeScript | 6.0.3 |
| **Database** | SQLite via `expo-sqlite` | Modern Async API |
| **State Management** | Zustand & AsyncStorage | Offline-first local store |
| **UI Components** | React Native Paper & Vector Icons | Material Design 3 |
| **Navigation** | React Navigation | Native Stacks & Bottom Tabs |
| **Cloud Sync** | Google Drive REST API v3 | OAuth 2.0 with PKCE & Zero-Touch |
| **Build Tool** | Expo Application Services (EAS) | Standalone Android APK builds |

---

## Project Structure

```text
khatha-finance-app/
├── App.tsx                                  # App root & providers
├── index.ts                                 # Metro entry point
├── app.json                                 # Expo configuration
├── eas.json                                 # EAS Build profiles (preview APK, production)
├── .easignore                               # Files excluded from cloud builds
├── .gitignore                               # Git ignore configuration
├── cloud-credentials.example.json           # Template for root credentials
├── PRIVACY_POLICY.md                        # Official Privacy Policy
├── TERMS_OF_SERVICE.md                      # Official Terms of Service
├── README.md                                # Comprehensive project guide
│
├── assets/                                  # App icons, splash screens, and images
│
├── docs/                                    # Technical architecture documentation
│   └── google-drive-backup-setup.md         # Detailed Google OAuth & Cloud Backup guide
│
├── src/
│   ├── components/                          # Reusable UI components (Cards, Modals, Inputs)
│   ├── database/                            # SQLite initialization & schema definitions
│   │   └── sqlite.ts
│   ├── hooks/                               # Custom React hooks
│   ├── navigation/                          # React Navigation stacks & tabs
│   │   └── AppNavigator.tsx
│   ├── screens/                             # Application views
│   │   ├── DashboardScreen.tsx
│   │   ├── BooksScreen.tsx
│   │   ├── ContactsScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── CloudBackupScreen.tsx            # Google Drive backup & restore management
│   ├── scripts/                             # Utility scripts
│   │   └── get-refresh-token.js             # Helper to generate permanent Google Refresh Tokens
│   ├── services/                            # Application business logic
│   │   ├── DatabaseService.ts               # Core SQLite queries & transactions
│   │   ├── BackupService.ts                 # Offline JSON export & import
│   │   ├── ExportService.ts                 # File sharing & export helpers
│   │   ├── ReportService.ts                 # Balance & report calculations
│   │   └── cloudBackup/                     # Google Drive Cloud Backup Subsystem
│   │       ├── CloudBackupManager.ts        # Orchestrator & mutation listeners
│   │       ├── DatabaseSnapshot.ts          # Deterministic serialization & SHA-256
│   │       ├── DeviceIdentity.ts            # Unique device UUID & friendly name
│   │       ├── GoogleAuthService.ts         # Token refresh & OAuth flows
│   │       ├── GoogleDriveService.ts        # Direct REST API v3 multipart upload/download
│   │       ├── RetentionService.ts          # Per-device backup pruning (keep latest 10)
│   │       ├── SequenceCoordinator.ts       # Global sequence allocation with ETags
│   │       ├── config.ts                    # Cloud backup configuration & endpoints
│   │       ├── localCredentials.example.ts  # TypeScript credential template
│   │       └── types.ts                     # TypeScript interfaces
│   ├── store/                               # Zustand stores
│   │   ├── index.ts                         # Core app state
│   │   └── cloudBackupStore.ts              # Backup connection & sync state
│   ├── theme/                               # Color tokens & theme definition
│   ├── translations/                        # i18n localization resources
│   │   ├── en.json
│   │   ├── hi.json
│   │   └── te.json
│   ├── types/                               # Global TypeScript models
│   └── utils/                               # Formatters, currency, and date helpers
│
└── tests/                                   # Automated test suite
    ├── run-all-tests.ts                     # 21-point test suite for cloud backup
    └── mocks/                               # React Native & storage mocks
```

---

## Quick Start

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Expo Go on your Android / iOS device (or an Android emulator)

### 2. Installation
```bash
# Clone repository
git clone https://github.com/MSKReddy7/khatha-finance-app.git
cd khatha-finance-app

# Install dependencies
npm install

# Typecheck codebase
npm run typecheck
```

### 3. Launch Development Server
```bash
npm start
```
Scan the QR code with **Expo Go** on Android or camera on iOS.

---

## Google Drive Cloud Backup (Zero-Touch)

Khatha Finance allows all family members or multiple devices to sync to **one central Google Drive** without requiring each device to log in.

### Step 1: Create OAuth Credentials in Google Cloud
1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Enable the **Google Drive API**.
3. Under **OAuth consent screen**, set **Publishing status** to **In production** (*Publish App*). This ensures your refresh token **never expires**.
4. Create an OAuth Client ID with Application type: **Desktop application**.
5. Download the client secret JSON file or note down your `client_id` and `client_secret`.

### Step 2: Generate Permanent Refresh Token (Automatic)
Drop your downloaded `client_secret_*.json` into the root folder of this project and run:
```bash
node src/scripts/get-refresh-token.js
```
- Your default web browser will open to Google's sign-in screen.
- Log in to your central Google Account once and click **Allow**.
- The script automatically captures your permanent refresh token and updates:
  - `cloud-credentials.json` (in root)
  - `src/services/cloudBackup/localCredentials.ts`

*(Manual alternative: Copy [`cloud-credentials.example.json`](./cloud-credentials.example.json) to `cloud-credentials.json` or [`src/services/cloudBackup/localCredentials.example.ts`](./src/services/cloudBackup/localCredentials.example.ts) to `localCredentials.ts` and paste your credentials).*

### Step 3: Verify in App
Restart or reload the app (`r` in the terminal). Open **Settings → Google Drive Cloud Backup**. You will see:
```text
✓ Google Drive (Family Cloud) · Active
```
Tap **"Back Up Now"** or record any transaction — it will sync directly to the `Khatha Finance Backups` folder in your Google Drive!

---

## Building Standalone APK

To create an installable `.apk` file that you can send directly to family members via WhatsApp or Telegram:

```bash
# Build standalone preview APK
npx eas build --platform android --profile preview
```

When the build finishes, EAS provides a **direct download link** to the `.apk` file. 

When installed on any phone, the APK connects automatically to your central Google Drive with **Zero Login Prompts**!

---

## Database & Offline-First Design

All financial data is stored locally on the device in an encrypted SQLite database:
- **`books`**: Book metadata, archiving status, and timestamps.
- **`contacts`**: Multi-currency balances, contact info, and notes.
- **`transactions`**: Double-entry records with foreign keys referencing books and contacts.

Database schema initialization runs automatically on launch via `src/database/sqlite.ts`. Every SQLite mutation triggers an automated background cloud backup with a 3-second debounce to prevent redundant network requests.

---

## Localization & Theming

- **Supported Languages:** English (`en`), Hindi (`hi`), Telugu (`te`). Change language at any time in **Settings → Language**.
- **Themes:** Light, Dark, System. Implemented with React Native Paper MD3 palettes.

---

## Documentation & Policies

- 📖 [Google Drive Backup Technical Architecture](docs/google-drive-backup-setup.md)
- 🔒 [Privacy Policy](PRIVACY_POLICY.md)
- 📜 [Terms of Service](TERMS_OF_SERVICE.md)

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
