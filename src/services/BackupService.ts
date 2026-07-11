import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { DatabaseService } from './DatabaseService';

export const BackupService = {
  /**
   * Exports the entire database schema (books, contacts, transactions)
   * into a JSON file and opens the native share sheet.
   */
  async exportBackup(): Promise<void> {
    try {
      const data = await DatabaseService.getRawDatabaseData();
      const jsonStr = JSON.stringify(data, null, 2);
      
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
   * validates its structure, and restores it to the database.
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

      const parsed = JSON.parse(content);

      // Validate schema structure
      if (
        !parsed ||
        !Array.isArray(parsed.books) ||
        !Array.isArray(parsed.contacts) ||
        !Array.isArray(parsed.transactions)
      ) {
        throw new Error('Invalid backup file format: Missing expected database tables');
      }

      // Restore data inside database
      await DatabaseService.restoreRawDatabaseData({
        books: parsed.books,
        contacts: parsed.contacts,
        transactions: parsed.transactions,
      });

      return true;
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  },
};
