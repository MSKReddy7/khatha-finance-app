import { Book, Contact, Transaction } from '../../types';

export interface BackupDataPayload {
  books: Book[];
  contacts: Contact[];
  transactions: Transaction[];
}

export interface BackupMetadata {
  format: 'khatha-backup';
  version: 1;
  backupId: number;
  deviceId: string;
  deviceName: string;
  createdAt: string; // ISO 8601 UTC
  appName: 'Khatha Finance';
  schemaVersion: 1;
  contentHash: string; // SHA-256 of canonical data
  recordCounts: {
    books: number;
    contacts: number;
    transactions: number;
  };
}

export interface CompleteBackupPackage {
  metadata: BackupMetadata;
  data: BackupDataPayload;
}

export interface CloudBackupItem {
  id: string; // Google Drive File ID
  name: string; // Filename: "{id} {name} {timestamp}.json"
  size?: number; // File size in bytes
  createdTime: string;
  modifiedTime: string;
  backupId: number;
  deviceId: string;
  deviceName: string;
  contentHash?: string;
  isValid: boolean;
  validationError?: string;
  isCurrentDevice: boolean;
}

export type SyncStatus =
  | 'idle'
  | 'checking'
  | 'uploading'
  | 'downloading'
  | 'restoring'
  | 'success'
  | 'error'
  | 'offline'
  | 'auth_required';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  tokenType: string;
  scope: string;
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

export interface SequenceManifest {
  lastBackupId: number;
  lastUpdatedByDeviceId: string;
  lastUpdatedTime: string;
}
