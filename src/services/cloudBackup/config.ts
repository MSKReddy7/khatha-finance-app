let localCreds: {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  expoGoClientId?: string;
} = {};

// Single source of truth: cloud-credentials.json in project root
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  localCreds = require('../../../cloud-credentials.json');
} catch (e) {
  // No credentials configured — cloud backup disabled until setup
}

export const CLOUD_BACKUP_CONFIG = {
  // Google OAuth Endpoints
  AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
  REVOKE_ENDPOINT: 'https://oauth2.googleapis.com/revoke',
  USERINFO_ENDPOINT: 'https://www.googleapis.com/oauth2/v3/userinfo',

  // Google Drive REST API Endpoints
  DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
  DRIVE_UPLOAD_ENDPOINT: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',

  // Scopes:
  // - drive.file: Per-file access to files created or opened by the app. Least-privilege and recommended.
  // - userinfo.email & profile: To display the authorized Google account in UI and verify central account match.
  SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],

  // Backup Folder
  DEFAULT_FOLDER_NAME: 'Khatha Finance Backups',
  SEQUENCE_MANIFEST_FILENAME: '_khatha_backup_sequence.json',

  // Retention
  RETENTION_PER_DEVICE: 10,

  // Debounce timing
  MUTATION_DEBOUNCE_MS: 3000,

  // Storage Keys for AsyncStorage (Non-sensitive)
  STORAGE_KEYS: {
    DEVICE_ID: 'khatha_cloud_device_id',
    DEVICE_NAME: 'khatha_cloud_device_name',
    DRIVE_FOLDER_ID: 'khatha_cloud_folder_id',
    LAST_BACKUP_HASH: 'khatha_cloud_last_hash',
    LAST_BACKUP_TIME: 'khatha_cloud_last_time',
    BACKUP_PENDING: 'khatha_cloud_backup_pending',
    AUTHORIZED_EMAIL: 'khatha_cloud_authorized_email',
    CUSTOM_CLIENT_ID: 'khatha_cloud_oauth_client_id',
    CUSTOM_CLIENT_SECRET: 'khatha_cloud_oauth_client_secret',
    CUSTOM_REFRESH_TOKEN: 'khatha_cloud_oauth_refresh_token',
  },

  // SecureStore Keys (Sensitive tokens)
  SECURE_KEYS: {
    ACCESS_TOKEN: 'khatha_cloud_sec_access_token',
    REFRESH_TOKEN: 'khatha_cloud_sec_refresh_token',
    TOKEN_EXPIRY: 'khatha_cloud_sec_token_expiry',
  },

  // Pre-configured Shared Credentials for Zero-Touch / No-Login mode across all family devices
  SHARED_CREDENTIALS: {
    CLIENT_ID: localCreds.clientId || '',
    CLIENT_SECRET: localCreds.clientSecret || '',
    REFRESH_TOKEN: localCreds.refreshToken || '',
  },

  // Web Client ID used for Expo Go interactive sign-in fallback if needed
  EXPO_GO_CLIENT_ID: localCreds.expoGoClientId || '',
  DEFAULT_CLIENT_ID: localCreds.expoGoClientId || '',
};
