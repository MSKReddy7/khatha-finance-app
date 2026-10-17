import { DeviceIdentity } from './DeviceIdentity';
import { SequenceManifest, CloudBackupItem } from './types';

export const SequenceCoordinator = {
  /**
   * Formats a UTC date into the requested timestamp string: "YYYY-MM-DD_HH-mm-ss".
   */
  formatUtcTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  },

  /**
   * Generates a backup filename matching the requested pattern:
   * "{sequential_backup_id} {backup_name} {timestamp}.json"
   * Example: "104 Manoj Phone 2026-10-17_21-30-45.json"
   */
  generateBackupFileName(backupId: number, deviceName: string, date: Date = new Date()): string {
    const sanitizedName = DeviceIdentity.sanitizeDeviceNameForFileName(deviceName);
    const timestamp = this.formatUtcTimestamp(date);
    return `${backupId} ${sanitizedName} ${timestamp}.json`;
  },

  /**
   * Parses a backup filename into its components.
   * Returns null if filename does not match pattern.
   */
  parseBackupFileName(fileName: string): {
    backupId: number;
    deviceName: string;
    timestamp: string;
  } | null {
    if (!fileName.endsWith('.json')) {
      return null;
    }

    const base = fileName.slice(0, -5); // remove .json
    const parts = base.split(' ');
    if (parts.length < 3) {
      return null;
    }

    const backupId = parseInt(parts[0], 10);
    if (isNaN(backupId) || backupId <= 0) {
      return null;
    }

    const timestamp = parts[parts.length - 1];
    const deviceName = parts.slice(1, parts.length - 1).join(' ');

    return { backupId, deviceName, timestamp };
  },

  /**
   * Allocates the next global sequential backup ID using Google Drive optimistic concurrency.
   *
   * Mechanism:
   * 1. Inspects all existing backup files in the central folder to find the highest ID.
   * 2. Reads the `_khatha_backup_sequence.json` manifest file and its HTTP ETag.
   * 3. Sets candidate ID = Math.max(highestFileId, manifest.lastBackupId, 0) + 1.
   * 4. Updates manifest using conditional HTTP header `If-Match: etag`.
   * 5. If Google Drive returns 412 Precondition Failed, a concurrent device updated the counter.
   *    In that case, retry with bounded exponential backoff (up to maxRetries).
   * 6. Returns the allocated ID.
   */
  async allocateNextBackupId(
    folderId: string,
    deviceId: string,
    maxRetries = 3
  ): Promise<number> {
    const { GoogleDriveService } = require('./GoogleDriveService');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 1. Scan existing files in folder
        const existingBackups = await GoogleDriveService.listBackups(folderId, deviceId);
        let highestFileId = 0;
        for (const b of existingBackups) {
          if (b.backupId > highestFileId) {
            highestFileId = b.backupId;
          }
        }

        // 2. Read manifest with ETag
        const { manifest, fileId, etag } = await GoogleDriveService.getSequenceManifest(folderId);
        const manifestLastId = manifest?.lastBackupId || 0;

        const maxObserved = Math.max(highestFileId, manifestLastId);
        const nextId = maxObserved + 1;

        // 3. Prepare updated manifest
        const newManifest: SequenceManifest = {
          lastBackupId: nextId,
          lastUpdatedByDeviceId: deviceId,
          lastUpdatedTime: new Date().toISOString(),
        };

        // 4. Attempt conditional update
        const updateResult = await GoogleDriveService.updateSequenceManifest(
          folderId,
          newManifest,
          fileId,
          etag
        );

        if (updateResult.success) {
          return nextId;
        }

        if (updateResult.conflict) {
          // Concurrency conflict detected! Back off and retry
          const backoffMs = 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
          console.warn(
            `Sequence ID conflict detected on attempt ${attempt + 1}. Retrying in ${backoffMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        // If update failed for other non-conflict reasons, proceed with nextId as best effort
        console.warn('Manifest update failed without conflict; using calculated sequential ID:', nextId);
        return nextId;
      } catch (err) {
        console.error(`Error during ID allocation attempt ${attempt + 1}:`, err);
        if (attempt === maxRetries - 1) {
          throw err;
        }
      }
    }

    throw new Error('Could not allocate global sequential backup ID due to persistent concurrency conflicts');
  },
};
