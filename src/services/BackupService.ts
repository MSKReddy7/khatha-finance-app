import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { DatabaseService } from './DatabaseService';
import { DatabaseSnapshot } from './cloudBackup/DatabaseSnapshot';
import { DeviceIdentity } from './cloudBackup/DeviceIdentity';
import { CompleteBackupPackage, BackupMetadata } from './cloudBackup/types';
import { CloudBackupManager } from './cloudBackup/CloudBackupManager';

export const BackupService = {
  /**
   * Exports the entire database schema (books, contacts, transactions)
   * into a formatted JSON backup file with metadata and opens the native share sheet.
   */
  async exportBackup(): Promise<void> {
    try {
      const data = await DatabaseSnapshot.readConsistentData();
      const contentHash = await DatabaseSnapshot.computeContentHash(data);
      const { deviceId, deviceName } = await DeviceIdentity.getDeviceInfo();
      const now = new Date();

      const metadata: BackupMetadata = {
        format: 'khatha-backup',
        version: 1,
        backupId: 0, // 0 denotes a local manual export
        deviceId,
        deviceName,
        createdAt: now.toISOString(),
        appName: 'Khatha Finance',
        schemaVersion: 1,
        contentHash,
        recordCounts: {
          books: data.books.length,
          contacts: data.contacts.length,
          transactions: data.transactions.length,
        },
      };

      const backupPackage: CompleteBackupPackage = {
        metadata,
        data,
      };

      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const fileName = `khatha_backup_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Khatha Book Backup',
          UTI: 'public.json', // iOS support
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Failed to export backup:', error);
      throw error;
    }
  },

  /**
   * Prompts the user to pick a JSON backup file,
   * validates its structure (supporting both legacy and wrapped formats),
   * and safely restores it to the database with transaction protection.
   * Schedules a cloud backup after successful import.
   * Returns true if import succeeded, false if cancelled.
   */
  async importBackup(): Promise<boolean> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return false;
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        throw new Error('Invalid JSON file');
      }

      // Validate schema and foreign key integrity using DatabaseSnapshot validator
      const validation = DatabaseSnapshot.validateBackupPayload(parsed);
      if (!validation.isValid || !validation.normalizedData) {
        throw new Error(validation.error || 'Invalid backup file format');
      }

      // Safely replace database contents
      await DatabaseService.restoreRawDatabaseData(validation.normalizedData);

      // Trigger cloud backup schedule because local data changed
      CloudBackupManager.scheduleBackup('mutation');

      return true;
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  },
};
