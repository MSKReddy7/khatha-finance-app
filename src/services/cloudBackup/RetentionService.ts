import { CLOUD_BACKUP_CONFIG } from './config';
import { CloudBackupItem } from './types';

export const RetentionService = {
  /**
   * Identifies which backups should be deleted based on per-device retention limits.
   * Pure function for easy testability.
   *
   * @param allBackups List of all backups found in the folder.
   * @param targetDeviceId Device ID whose backups should be pruned (defaults to current device).
   * @param maxKeep Maximum backups to keep for the device (defaults to 10).
   * @returns Array of CloudBackupItem that should be removed.
   */
  getBackupsToPrune(
    allBackups: CloudBackupItem[],
    targetDeviceId: string,
    maxKeep = CLOUD_BACKUP_CONFIG.RETENTION_PER_DEVICE
  ): CloudBackupItem[] {
    // 1. Filter backups belonging ONLY to targetDeviceId and marked valid
    const deviceBackups = allBackups.filter(
      (b) => b.deviceId === targetDeviceId && b.isValid && b.id
    );

    // 2. Sort by backupId descending (newest first). If backupIds match, sort by createdTime descending.
    deviceBackups.sort((a, b) => {
      if (b.backupId !== a.backupId) {
        return b.backupId - a.backupId;
      }
      return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
    });

    // 3. If device has <= maxKeep backups, nothing to prune
    if (deviceBackups.length <= maxKeep) {
      return [];
    }

    // 4. Return backups exceeding the retention limit (index >= maxKeep)
    // NEVER includes the newest backup (index 0)
    return deviceBackups.slice(maxKeep);
  },

  /**
   * Executes retention cleanup for the specified device in Google Drive.
   * Only deletes older backups belonging to targetDeviceId.
   * Never deletes another device's backups.
   */
  async enforceRetentionForDevice(
    folderId: string,
    targetDeviceId: string,
    maxKeep = CLOUD_BACKUP_CONFIG.RETENTION_PER_DEVICE
  ): Promise<{ deletedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      const { GoogleDriveService } = require('./GoogleDriveService');
      const allBackups = await GoogleDriveService.listBackups(folderId, targetDeviceId);
      const toDelete = this.getBackupsToPrune(allBackups, targetDeviceId, maxKeep);

      if (toDelete.length === 0) {
        return { deletedCount: 0, errors: [] };
      }

      for (const item of toDelete) {
        try {
          console.log(`Pruning expired backup for device ${targetDeviceId}: ${item.name} (${item.id})`);
          await GoogleDriveService.deleteBackupFile(item.id);
          deletedCount++;
        } catch (err: any) {
          const msg = `Failed to delete old backup ${item.name}: ${err.message || err}`;
          console.warn(msg);
          errors.push(msg);
        }
      }
    } catch (e: any) {
      errors.push(`Retention enforcement failed: ${e.message || e}`);
    }

    return { deletedCount, errors };
  },
};
