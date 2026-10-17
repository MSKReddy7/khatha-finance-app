# Khatha Finance App

A React Native Expo app for managing personal lending and borrowing records. The app helps users create books, add contacts, record transactions like money given or received, track balances, and export/import backup data.

This project is built with Expo SDK 56, React Native 0.86.3, TypeScript, SQLite, and React Navigation.

## Overview

The app is organized around a simple accounting workflow:

- Create one or more books for different groups or people
- Add contacts inside each book
- Record transactions as either GAVE or RECEIVED
- View contact-level and book-level summaries
- Search, filter, and sort records
- Archive books instead of permanently deleting them
- Switch between English, Hindi, and Telugu
- Choose light/dark/system theme
- Export and import backup JSON files

## Tech Stack

- Expo SDK 56
- React Native 0.86.3
- React 19.2.3
- TypeScript 6.0.3
- SQLite via expo-sqlite
- React Navigation
- Zustand for local state
- AsyncStorage for persistent settings
- React Native Paper for UI components
- i18next for translations
- Expo File System / Sharing / Document Picker for backup operations

## Features

### Book management

- Create, edit, archive, restore, and delete books
- View total summaries for each book
- Search books by name
- Sort books by date or alphabetically

### Contact management

- Add contacts under a selected book
- Store phone number, address, and notes
- Calculate each contact’s net balance and totals
- Delete and edit contact records

### Transaction tracking

- Record transactions with type: GAVE or RECEIVED
- Store amount, note, and transaction date
- Sort and review transaction history
- View totals across each book and contact

### Reporting and dashboard

- Dashboard totals for books, contacts, and amount summaries
- View top debtors / pending balances
- Book-level reports and balance calculations

### Settings and preferences

- Select language: English, Hindi, Telugu
- Switch between light, dark, and system theme
- Manage archived books
- Export and import database backups as JSON

## Project Structure

```text
.
├── App.tsx
├── app.json
├── eas.json
├── index.ts
├── package.json
├── tsconfig.json
├── README.md
├── assets/
│   ├── favicon.png
│   ├── hell.png
│   ├── splash-icon.png
│   └── ...
├── src/
│   ├── components/
│   ├── database/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── store/
│   ├── theme/
│   ├── translations/
│   ├── types/
│   └── utils/
└── ...
```

### Key files

- `App.tsx`: App bootstrap, splash screen handling, SQLite provider, theme, and navigation setup
- `src/database/sqlite.ts`: SQLite schema creation and initialization
- `src/services/DatabaseService.ts`: CRUD logic for books, contacts, and transactions
- `src/services/BackupService.ts`: Export/import backup support
- `src/store/index.ts`: Zustand store for app settings and refresh state
- `src/navigation/AppNavigator.tsx`: Tab and stack navigation structure
- `src/translations/index.ts`: i18n setup with English/Hindi/Telugu resources
- `src/theme/index.ts`: custom app themes
- `app.json`: Expo app metadata and native config
- `eas.json`: EAS build profiles for development, preview, and production

## Installation

Make sure Node.js is installed. This app targets Expo SDK 56, which expects Node 20.19.x or newer as a practical minimum.

1. Clone the repository.
2. Open the project folder.
3. Install dependencies:

```bash
npm install
```

If you prefer Yarn:

```bash
yarn install
```

## Running the App

### Start the Expo development server

```bash
npm run start
```

Or directly:

```bash
npx expo start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Run in web mode

```bash
npm run web
```

## Common Expo Commands

```bash
npx expo start --clear
npx expo install
npx expo doctor
```

## Build Commands

This project includes EAS configuration in `eas.json`.

### Development build

```bash
npx eas build --platform android --profile development
```

```bash
npx eas build --platform ios --profile development
```

### Preview build

```bash
npx eas build --platform android --profile preview
```

```bash
npx eas build --platform ios --profile preview
```

### Production build

```bash
npx eas build --platform android --profile production
```

```bash
npx eas build --platform ios --profile production
```

### Build for both platforms

```bash
npx eas build --platform all --profile production
```

> If EAS is not configured on your machine yet, you may need to log in first:
>
> ```bash
> npx eas login
> ```

## App Database

The app stores data locally in a SQLite database named:

```text
khatha.db
```

Database schema includes:

- books
- contacts
- transactions

The initialization logic is in `src/database/sqlite.ts` and runs when the app starts through the SQLite provider in `App.tsx`.

## Backup and Restore

The app supports both offline file export/import and automated Google Drive Cloud Backup.

### 1. Google Drive Cloud Backup (Zero-Touch Multi-Device)

Khatha Finance includes a production-grade, zero-touch Google Drive backup system:
- **Direct Drive REST API v3 Integration:** Connects directly from the device to Google Drive under the minimal `drive.file` scope.
- **Zero-Touch Background Mode:** All family devices sync automatically to a central Google Drive without prompting any family member to sign in.
- **SHA-256 Change Detection:** Calculates a deterministic hash of all tables and skips uploading if no financial mutations occurred.
- **Sequential Global IDs:** Coordinates IDs (`{id} {deviceName} {timestamp}.json`) via an optimistic concurrency manifest (`_khatha_backup_sequence.json`).
- **Per-Device Retention Policy:** Retains the 10 most recent backups for each device while protecting other devices' backups.
- **Atomic Replace & Rollback:** When restoring from cloud, SQLite replaces the database atomically with an automatic rollback safeguard if restore fails.

#### Setting up Google Drive Backup after Cloning

When you clone this repository to a new computer:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Google Cloud OAuth Credentials:**
   - Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
   - Create an OAuth 2.0 Client ID of type **Desktop application**.
   - Download the client secret JSON file or note down your `client_id` and `client_secret`.
   - Make sure your project's OAuth Consent screen is set to **In production** (Publish App) so your tokens never expire.

3. **Configure the credentials (Choose Option A or B):**

   - **Option A (Automatic - Recommended):**
     Place the downloaded `client_secret_*.json` into the root folder of this project and run:
     ```bash
     node scripts/get-refresh-token.js
     ```
     Your browser will open. Log in to your central Google Account once and click **Allow**. The script will automatically generate your permanent Refresh Token and create `src/services/cloudBackup/localCredentials.ts` and `credentials/cloud-credentials.json`!

   - **Option B (Manual template copy):**
     Copy the template file:
     ```bash
     cp src/services/cloudBackup/localCredentials.example.ts src/services/cloudBackup/localCredentials.ts
     ```
     Then open `localCredentials.ts` and fill in your `clientId`, `clientSecret`, and `refreshToken`.

4. **Run the App:**
   ```bash
   npm start
   ```
   Open **Settings → Google Drive Cloud Backup**. You will see:
   ```text
   ✓ Google Drive (Family Cloud) · Active
   ```

5. **Build APK for Family Members:**
   ```bash
   npx eas build --platform android --profile preview
   ```
   EAS will compile an installable `.apk` file with the zero-touch credentials pre-bundled. Share the download link or `.apk` on WhatsApp or Telegram with your family!

### 2. Manual JSON File Export & Import (Offline)

- **Export backup:** From the Settings screen, choose Export. The app writes a canonical JSON snapshot and shares it via the native share sheet.
- **Import backup:** From the Settings screen, choose Import. The app restores books, contacts, and transactions into SQLite.

## Localization

Supported languages:

- English (`en`)
- Hindi (`hi`)
- Telugu (`te`)

Translation files are located here:

- `src/translations/en.json`
- `src/translations/hi.json`
- `src/translations/te.json`

## Theme Support

The app supports:

- Light mode
- Dark mode
- System mode

Theme configuration is defined in `src/theme/index.ts` and applied through `useAppTheme`.

## Notes

- The project intentionally keeps data local to the device and does not require a backend service.
- A local SQLite database is used for quick offline access and storage.
- The app uses the Expo splash screen and initializes the database before showing the main UI.

## Recommended Development Flow

```bash
npm install
npm run start
```

Then use the Expo dev client or simulator to test features.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
