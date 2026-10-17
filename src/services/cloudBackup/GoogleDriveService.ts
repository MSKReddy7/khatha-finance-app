import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_BACKUP_CONFIG } from './config';
import { GoogleAuthService } from './GoogleAuthService';
import { CloudBackupItem, SequenceManifest, BackupMetadata } from './types';

export class DriveApiError extends Error {
  statusCode: number;
  isRetryable: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'DriveApiError';
    this.statusCode = statusCode;
    // 429: Too Many Requests, 5xx: Server errors are retryable
    this.isRetryable = statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  }
}

export const GoogleDriveService = {
  /**
   * Helper to perform authenticated fetch to Google Drive API.
   */
  async fetchDrive(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await GoogleAuthService.getValidAccessToken();
    if (!accessToken) {
      throw new DriveApiError('Authentication required. Please sign in to Google Drive.', 401);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...((options.headers as any) || {}),
    };

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token might be revoked
      await GoogleAuthService.signOut();
      throw new DriveApiError('Google authorization expired or was revoked. Please sign in again.', 401);
    }

    return response;
  },

  /**
   * Finds or creates the dedicated central backup folder in Google Drive.
   */
  async findOrCreateBackupFolder(folderName = CLOUD_BACKUP_CONFIG.DEFAULT_FOLDER_NAME): Promise<string> {
    try {
      // Check cached folder ID first
      const cachedFolderId = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DRIVE_FOLDER_ID);
      if (cachedFolderId) {
        // Verify folder still exists and is accessible
        const checkRes = await this.fetchDrive(
          `${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files/${cachedFolderId}?fields=id,trashed,name`
        );
        if (checkRes.ok) {
          const folder = await checkRes.json();
          if (!folder.trashed) {
            return folder.id;
          }
        }
      }

      // Search for folder by name
      const query = encodeURIComponent(
        `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`
      );
      const searchRes = await this.fetchDrive(
        `${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)&spaces=drive`
      );

      if (!searchRes.ok) {
        throw new DriveApiError(`Failed to search folders: ${searchRes.statusText}`, searchRes.status);
      }

      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DRIVE_FOLDER_ID, folderId);
        return folderId;
      }

      // Folder does not exist, create it
      const createRes = await this.fetchDrive(`${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (!createRes.ok) {
        throw new DriveApiError(`Failed to create backup folder: ${createRes.statusText}`, createRes.status);
      }

      const createdFolder = await createRes.json();
      await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DRIVE_FOLDER_ID, createdFolder.id);
      return createdFolder.id;
    } catch (error) {
      console.error('Error finding or creating backup folder:', error);
      throw error;
    }
  },

  /**
   * Lists all backup files in the backup folder across all devices.
   */
  async listBackups(folderId: string, currentDeviceId: string): Promise<CloudBackupItem[]> {
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
    );

    let allFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const url = `${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files?q=${query}&fields=nextPageToken,files(id,name,size,createdTime,modifiedTime,description,appProperties,properties)&pageSize=100${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`;

      const res = await this.fetchDrive(url);
      if (!res.ok) {
        throw new DriveApiError(`Failed to list backup files: ${res.statusText}`, res.status);
      }

      const data = await res.json();
      if (data.files) {
        allFiles = allFiles.concat(data.files);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Filter out sequence manifest file
    const backupFiles = allFiles.filter(
      (f) => f.name !== CLOUD_BACKUP_CONFIG.SEQUENCE_MANIFEST_FILENAME
    );

    // Map each file to CloudBackupItem
    const items: CloudBackupItem[] = backupFiles.map((file) => {
      const appProps = file.appProperties || {};
      const parsedFromProps = {
        backupId: appProps.backupId ? parseInt(appProps.backupId, 10) : undefined,
        deviceId: appProps.deviceId,
        deviceName: appProps.deviceName,
        contentHash: appProps.contentHash,
      };

      // Also parse filename pattern: "{backupId} {deviceName} {timestamp}.json"
      // Example: "104 Manoj Phone 2026-10-17_21-30-45.json"
      const nameParts = file.name.replace(/\.json$/i, '').split(' ');
      let backupIdFromName = 0;
      let deviceNameFromName = 'Unknown Device';

      if (nameParts.length >= 3) {
        const parsedId = parseInt(nameParts[0], 10);
        if (!isNaN(parsedId)) {
          backupIdFromName = parsedId;
        }
        // Timestamp is the last part
        deviceNameFromName = nameParts.slice(1, nameParts.length - 1).join(' ');
      }

      const backupId = parsedFromProps.backupId || backupIdFromName;
      const deviceId = parsedFromProps.deviceId || 'unknown-device';
      const deviceName = parsedFromProps.deviceName || deviceNameFromName;
      const isValid = backupId > 0 && file.name.endsWith('.json');

      return {
        id: file.id,
        name: file.name,
        size: file.size ? parseInt(file.size, 10) : undefined,
        createdTime: file.createdTime || new Date().toISOString(),
        modifiedTime: file.modifiedTime || file.createdTime || new Date().toISOString(),
        backupId,
        deviceId,
        deviceName,
        contentHash: parsedFromProps.contentHash,
        isValid,
        validationError: !isValid ? 'Unrecognized filename or missing backup ID' : undefined,
        isCurrentDevice: deviceId === currentDeviceId,
      };
    });

    // Sort by backupId descending (newest first)
    items.sort((a, b) => b.backupId - a.backupId);
    return items;
  },

  /**
   * Retrieves the sequence coordination manifest file from Drive.
   */
  async getSequenceManifest(folderId: string): Promise<{
    manifest: SequenceManifest | null;
    fileId: string | null;
    etag: string | null;
  }> {
    try {
      const query = encodeURIComponent(
        `'${folderId}' in parents and name = '${CLOUD_BACKUP_CONFIG.SEQUENCE_MANIFEST_FILENAME}' and trashed = false`
      );
      const res = await this.fetchDrive(
        `${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)&spaces=drive`
      );

      if (!res.ok) {
        return { manifest: null, fileId: null, etag: null };
      }

      const data = await res.json();
      if (!data.files || data.files.length === 0) {
        return { manifest: null, fileId: null, etag: null };
      }

      const fileId = data.files[0].id;

      // Download content with ETag
      const contentRes = await this.fetchDrive(
        `${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files/${fileId}?alt=media`
      );

      if (!contentRes.ok) {
        return { manifest: null, fileId, etag: null };
      }

      const etag = contentRes.headers.get('ETag');
      const manifest = await contentRes.json();
      return { manifest, fileId, etag };
    } catch (e) {
      console.warn('Could not read sequence manifest:', e);
      return { manifest: null, fileId: null, etag: null };
    }
  },

  /**
   * Updates or creates the sequence manifest in Drive.
   * If existing file ID and ETag are provided, uses If-Match for conditional concurrency check.
   */
  async updateSequenceManifest(
    folderId: string,
    manifest: SequenceManifest,
    existingFileId?: string | null,
    etag?: string | null
  ): Promise<{ success: boolean; conflict?: boolean; fileId?: string }> {
    const jsonBody = JSON.stringify(manifest, null, 2);

    try {
      if (existingFileId) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json; charset=UTF-8',
        };
        if (etag) {
          headers['If-Match'] = etag;
        }

        const updateRes = await this.fetchDrive(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers,
            body: jsonBody,
          }
        );

        if (updateRes.status === 412) {
          // Precondition Failed: another device updated the manifest concurrently
          return { success: false, conflict: true };
        }

        if (!updateRes.ok) {
          return { success: false, conflict: false };
        }

        return { success: true, fileId: existingFileId };
      } else {
        // Create manifest via multipart
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
          name: CLOUD_BACKUP_CONFIG.SEQUENCE_MANIFEST_FILENAME,
          parents: [folderId],
          mimeType: 'application/json',
        };

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          jsonBody +
          closeDelimiter;

        const createRes = await this.fetchDrive(CLOUD_BACKUP_CONFIG.DRIVE_UPLOAD_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        });

        if (!createRes.ok) {
          return { success: false };
        }

        const created = await createRes.json();
        return { success: true, fileId: created.id };
      }
    } catch (e) {
      console.error('Error updating sequence manifest:', e);
      return { success: false };
    }
  },

  /**
   * Uploads a complete backup JSON file into the central Drive backup folder.
   * Uses multipart upload to set Drive file metadata and content in a single atomic request.
   */
  async uploadBackupFile(
    folderId: string,
    fileName: string,
    jsonContent: string,
    metadata: BackupMetadata
  ): Promise<{ id: string; name: string }> {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const driveMetadata = {
      name: fileName,
      parents: [folderId],
      description: `Khatha Finance Backup #${metadata.backupId} by ${metadata.deviceName}`,
      appProperties: {
        backupId: String(metadata.backupId),
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        contentHash: metadata.contentHash,
        version: String(metadata.version),
        schemaVersion: String(metadata.schemaVersion),
        createdAt: metadata.createdAt,
      },
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(driveMetadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const res = await this.fetchDrive(CLOUD_BACKUP_CONFIG.DRIVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new DriveApiError(`Drive upload failed (${res.status}): ${errText}`, res.status);
    }

    const created = await res.json();
    return { id: created.id, name: created.name };
  },

  /**
   * Downloads a backup file's contents from Google Drive.
   */
  async downloadBackupFile(fileId: string): Promise<any> {
    const res = await this.fetchDrive(
      `${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files/${fileId}?alt=media`
    );

    if (!res.ok) {
      throw new DriveApiError(`Failed to download backup file: ${res.statusText}`, res.status);
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Downloaded file is not valid JSON');
    }
  },

  /**
   * Deletes a backup file by ID from Google Drive.
   */
  async deleteBackupFile(fileId: string): Promise<void> {
    const res = await this.fetchDrive(`${CLOUD_BACKUP_CONFIG.DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
    });

    // 204 No Content is normal success; 404 means already deleted (idempotent)
    if (!res.ok && res.status !== 404) {
      throw new DriveApiError(`Failed to delete backup file ${fileId}: ${res.statusText}`, res.status);
    }
  },
};
