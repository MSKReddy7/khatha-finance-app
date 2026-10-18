import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { getDb } from '../../database/sqlite';
import { useDataStore } from '../../store';
import { useCloudBackupStore } from '../../store/cloudBackupStore';
import { CLOUD_BACKUP_CONFIG } from './config';
import { DatabaseSnapshot } from './DatabaseSnapshot';
import { DeviceIdentity } from './DeviceIdentity';
import { GoogleAuthService } from './GoogleAuthService';
import { GoogleDriveService } from './GoogleDriveService';
import { RetentionService } from './RetentionService';
import { SequenceCoordinator } from './SequenceCoordinator';
import { CompleteBackupPackage, BackupMetadata } from './types';
import { EventSubscription } from 'expo-modules-core';

class CloudBackupManagerClass {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isExecuting = false;
  private needsRerun = false;
  private networkSubscription: EventSubscription | null = null;
  private wasConnected: boolean | null = null; // null = unknown (first reading)

  /**
   * Initializes the cloud backup subsystem on application startup.
   */
  async initialize(): Promise<void> {
    try {
      const { deviceId, deviceName } = await DeviceIdentity.getDeviceInfo();
      const store = useCloudBackupStore.getState();
      store.setDeviceInfo(deviceId, deviceName);

      const isAuthed = await GoogleAuthService.isAuthenticated();
      const email = await GoogleAuthService.getAuthorizedEmail();
      const clientId = await GoogleAuthService.getClientId();
      store.setConnected(isAuthed, email);
      store.setClientId(clientId);

      const lastHash = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_HASH);
      const lastTime = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_TIME);
      if (lastHash && lastTime) {
        store.setLastBackup(lastTime, lastHash);
      }

      const pendingStr = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.BACKUP_PENDING);
      const isPending = pendingStr === 'true';
      store.setPending(isPending);

      // If authenticated or pre-configured, refresh the backup list in the background
      if (isAuthed) {
        this.refreshBackupsList().catch(() => {});
      }

      // If a backup was pending when the app was previously closed, attempt to process it now
      if (isPending && isAuthed) {
        console.log('Pending backup detected on launch. Scheduling retry...');
        this.scheduleBackup('retry');
      }
    } catch (error) {
      console.warn('Error during CloudBackupManager initialization:', error);
    }
  }

  /**
   * Starts listening to Android/iOS network broadcast events.
   * Triggers a backup retry automatically whenever the device regains internet
   * connectivity and either a backup is pending or data is un-synced.
   */
  startNetworkListener(): void {
    if (this.networkSubscription) return; // already subscribed

    this.networkSubscription = Network.addNetworkStateListener(async (state) => {
      const isNowConnected = !!(state.isConnected && state.isInternetReachable);

      // Update the store's offline indicator
      const store = useCloudBackupStore.getState();
      if (!isNowConnected) {
        store.setStatus('offline', 'Device is offline. Backup will sync when online.');
      }

      // Only act on offline → online transitions
      if (!isNowConnected) {
        this.wasConnected = false;
        return;
      }

      const wasOffline = this.wasConnected === false;
      this.wasConnected = true;

      if (!wasOffline) return; // Already knew we were online — nothing to react to

      console.log('Network restored. Checking for pending backup...');

      try {
        const isAuthed = await GoogleAuthService.isAuthenticated();
        if (!isAuthed) return;

        const pendingStr = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.BACKUP_PENDING);
        const lastHash = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_HASH);

        let hasUnsynced = pendingStr === 'true';

        // Also check if live data hash differs from last backup hash (covers missed mutations)
        if (!hasUnsynced && lastHash) {
          try {
            const snapshot = await DatabaseSnapshot.readConsistentData();
            const currentHash = await DatabaseSnapshot.computeContentHash(snapshot);
            if (currentHash !== lastHash) {
              console.log('Data hash mismatch detected on network restore — scheduling backup.');
              hasUnsynced = true;
            }
          } catch (_) { /* non-critical */ }
        }

        if (hasUnsynced) {
          console.log('Pending/unsynced data found. Triggering backup after network restore.');
          this.scheduleBackup('retry');
        }
      } catch (err) {
        console.warn('Network restore handler error:', err);
      }
    });

    console.log('Network state listener started.');
  }

  /**
   * Removes the network connectivity listener.
   */
  stopNetworkListener(): void {
    if (this.networkSubscription) {
      this.networkSubscription.remove();
      this.networkSubscription = null;
      this.wasConnected = null;
      console.log('Network state listener stopped.');
    }
  }

  /**
   * Schedules a backup with debouncing for frequent database mutations.
   * If a backup is already executing, sets a flag to trigger immediately upon completion.
   */
  scheduleBackup(reason: 'mutation' | 'manual' | 'retry' = 'mutation'): void {
    const store = useCloudBackupStore.getState();

    // Mark pending in store & storage immediately
    store.setPending(true);
    AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.BACKUP_PENDING, 'true').catch(() => {});

    // If currently executing an upload or already waiting on a timer, queue follow-up backup
    if (this.isExecuting || this.debounceTimer) {
      this.needsRerun = true;
      return;
    }

    if (reason === 'manual') {
      this.performBackup('manual');
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.performBackup(reason);
    }, CLOUD_BACKUP_CONFIG.MUTATION_DEBOUNCE_MS);
  }

  /**
   * Performs the backup workflow.
   * Ensures deterministic hashing, change detection, ID allocation, upload, and retention.
   */
  async performBackup(reason = 'auto'): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
    const store = useCloudBackupStore.getState();

    // Serialization: prevent concurrent runs
    if (this.isExecuting) {
      console.log('Cloud backup is already executing. Queuing follow-up backup.');
      this.needsRerun = true;
      return { success: false, error: 'Backup already in progress' };
    }

    this.isExecuting = true;

    try {
      // 1. Check authentication
      const isAuthed = await GoogleAuthService.isAuthenticated();
      if (!isAuthed) {
        store.setStatus('auth_required', 'Google authorization required');
        return { success: false, error: 'Not authenticated with Google' };
      }

      // 2. Check network connectivity
      try {
        const netState = await Network.getNetworkStateAsync();
        if (!netState.isConnected || !netState.isInternetReachable) {
          store.setStatus('offline', 'Device is offline. Backup will sync when online.');
          return { success: false, error: 'Device is offline' };
        }
      } catch (netErr) {
        // Continue if network check is unsupported
      }

      store.setStatus('checking', 'Checking for database changes...');

      // 3. Read consistent snapshot and compute content hash
      const snapshot = await DatabaseSnapshot.readConsistentData();
      const contentHash = await DatabaseSnapshot.computeContentHash(snapshot);
      const lastHash = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_HASH);

      // 4. Skip upload if data has not changed
      if (lastHash && lastHash === contentHash && reason !== 'manual') {
        console.log('Database content hash matches last backup. Skipping upload.');
        if (!this.needsRerun) {
          await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.BACKUP_PENDING, 'false');
          store.setPending(false);
        }
        store.setStatus('idle', 'No changes detected. Database is up to date.');
        return { success: true, skipped: true };
      }

      store.setStatus('uploading', 'Preparing cloud backup...');

      // 5. Get or create central backup folder
      const folderId = await GoogleDriveService.findOrCreateBackupFolder();

      // 6. Allocate globally sequential backup ID
      const { deviceId, deviceName } = await DeviceIdentity.getDeviceInfo();
      const backupId = await SequenceCoordinator.allocateNextBackupId(folderId, deviceId);

      // 7. Build backup package and metadata
      const now = new Date();
      const utcCreatedAt = now.toISOString();

      const metadata: BackupMetadata = {
        format: 'khatha-backup',
        version: 1,
        backupId,
        deviceId,
        deviceName,
        createdAt: utcCreatedAt,
        appName: 'Khatha Finance',
        schemaVersion: 1,
        contentHash,
        recordCounts: {
          books: snapshot.books.length,
          contacts: snapshot.contacts.length,
          transactions: snapshot.transactions.length,
        },
      };

      const backupPackage: CompleteBackupPackage = {
        metadata,
        data: snapshot,
      };

      const jsonString = JSON.stringify(backupPackage, null, 2);
      const fileName = SequenceCoordinator.generateBackupFileName(backupId, deviceName, now);

      // 8. Upload to Google Drive
      store.setStatus('uploading', `Uploading backup #${backupId} to Google Drive...`);
      const uploadResult = await GoogleDriveService.uploadBackupFile(
        folderId,
        fileName,
        jsonString,
        metadata
      );

      console.log(`Successfully uploaded backup #${backupId} (${uploadResult.id})`);

      // 9. Update local sync state
      await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_HASH, contentHash);
      await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_TIME, utcCreatedAt);
      if (!this.needsRerun) {
        await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.BACKUP_PENDING, 'false');
        store.setPending(false);
      }
      store.setLastBackup(utcCreatedAt, contentHash);

      // 10. Enforce retention (keep latest 10 backups for this device)
      try {
        await RetentionService.enforceRetentionForDevice(folderId, deviceId);
      } catch (retentionErr) {
        console.warn('Retention cleanup non-critical error:', retentionErr);
      }

      // 11. Refresh available backups list
      await this.refreshBackupsList();

      store.setStatus('success', `Backup #${backupId} saved successfully.`);
      return { success: true };
    } catch (error: any) {
      console.error('Error during performBackup:', error);
      const msg = error.message || 'Backup failed';
      store.setStatus('error', msg);
      return { success: false, error: msg };
    } finally {
      this.isExecuting = false;
      if (this.needsRerun) {
        this.needsRerun = false;
        console.log('Running queued backup for mutations that occurred during previous upload...');
        this.scheduleBackup('mutation');
      }
    }
  }

  /**
   * Refreshes the list of backups from the Google Drive backup folder.
   */
  async refreshBackupsList(): Promise<void> {
    const store = useCloudBackupStore.getState();
    const isAuthed = await GoogleAuthService.isAuthenticated();
    if (!isAuthed) {
      store.setBackups([]);
      return;
    }

    store.setLoadingBackups(true);
    try {
      const folderId = await GoogleDriveService.findOrCreateBackupFolder();
      const deviceId = await DeviceIdentity.getOrCreateDeviceId();
      const backups = await GoogleDriveService.listBackups(folderId, deviceId);
      store.setBackups(backups);
    } catch (err: any) {
      console.warn('Failed to refresh backup list from Drive:', err);
    } finally {
      store.setLoadingBackups(false);
    }
  }

  /**
   * Restores a selected backup file from Google Drive into the local database.
   * Completely REPLACES local data within an exclusive SQLite transaction.
   * Creates a safety rollback snapshot in memory before replacement.
   */
  async restoreBackup(fileId: string): Promise<{ success: boolean; error?: string }> {
    const store = useCloudBackupStore.getState();

    if (this.isExecuting) {
      return { success: false, error: 'Another sync operation is in progress' };
    }
    this.isExecuting = true;

    try {
      store.setStatus('downloading', 'Downloading backup file from Google Drive...');
      const downloadedJson = await GoogleDriveService.downloadBackupFile(fileId);

      store.setStatus('restoring', 'Validating backup integrity and schema...');
      const validation = DatabaseSnapshot.validateBackupPayload(downloadedJson);
      if (!validation.isValid || !validation.normalizedData) {
        throw new Error(validation.error || 'Downloaded backup is invalid or corrupted');
      }

      const { books, contacts, transactions } = validation.normalizedData;

      // Create a safety local rollback snapshot before wiping
      const currentLocalData = await DatabaseSnapshot.readConsistentData();

      store.setStatus('restoring', 'Replacing local database...');
      const db = getDb();

      // Execute atomic replacement in SQLite transaction
      await db.withTransactionAsync(async () => {
        // Temporarily disable foreign keys during clear
        await db.execAsync('PRAGMA foreign_keys = OFF;');

        await db.runAsync('DELETE FROM transactions;');
        await db.runAsync('DELETE FROM contacts;');
        await db.runAsync('DELETE FROM books;');

        // Insert restored books
        for (const book of books) {
          await db.runAsync(
            'INSERT INTO books (id, name, description, created_at, updated_at, is_archived) VALUES (?, ?, ?, ?, ?, ?)',
            [
              book.id,
              book.name,
              book.description || '',
              book.created_at,
              book.updated_at,
              book.is_archived ? 1 : 0,
            ]
          );
        }

        // Insert restored contacts
        for (const contact of contacts) {
          await db.runAsync(
            'INSERT INTO contacts (id, book_id, name, phone_number, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              contact.id,
              contact.book_id,
              contact.name,
              contact.phone_number || '',
              contact.address || '',
              contact.notes || '',
              contact.created_at,
              contact.updated_at,
            ]
          );
        }

        // Insert restored transactions
        for (const tx of transactions) {
          await db.runAsync(
            'INSERT INTO transactions (id, contact_id, type, amount, note, transaction_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              tx.id,
              tx.contact_id,
              tx.type,
              tx.amount,
              tx.note || '',
              tx.transaction_date,
              tx.created_at,
              tx.updated_at,
            ]
          );
        }

        // Re-enable foreign keys
        await db.execAsync('PRAGMA foreign_keys = ON;');
      });

      // Compute content hash of newly restored data
      const restoredHash = await DatabaseSnapshot.computeContentHash({
        books,
        contacts,
        transactions,
      });

      // Update sync state to avoid triggering immediate redundant upload of the restored state
      const now = new Date().toISOString();
      await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_HASH, restoredHash);
      await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.LAST_BACKUP_TIME, now);
      await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.BACKUP_PENDING, 'false');

      store.setLastBackup(now, restoredHash);
      store.setPending(false);

      // Refresh application Zustand store so all screens update immediately
      useDataStore.getState().triggerRefresh();

      store.setStatus('success', 'Database restored successfully.');
      this.isExecuting = false;
      return { success: true };
    } catch (error: any) {
      console.error('Failed to restore backup:', error);
      const errorMsg = error.message || 'Restoration failed. Local data preserved.';
      store.setStatus('error', errorMsg);
      this.isExecuting = false;
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Deletes a user-selected backup file from Google Drive.
   */
  async deleteBackup(fileId: string): Promise<boolean> {
    try {
      await GoogleDriveService.deleteBackupFile(fileId);
      await this.refreshBackupsList();
      return true;
    } catch (err) {
      console.error('Failed to delete backup:', err);
      return false;
    }
  }
}

export const CloudBackupManager = new CloudBackupManagerClass();
