import { CLOUD_BACKUP_CONFIG } from './config';
import { DeviceInfo } from './types';

const getAsyncStorage = () => {
  try {
    const mod = require('@react-native-async-storage/async-storage');
    return mod.default || mod;
  } catch {
    return null;
  }
};

const getExpoCrypto = () => {
  try {
    return require('expo-crypto');
  } catch {
    return null;
  }
};

export const DeviceIdentity = {
  /**
   * Retrieves or creates a stable UUID for this device installation.
   * Stored in AsyncStorage. Not a hardware serial number.
   */
  async getOrCreateDeviceId(): Promise<string> {
    try {
      const storage = getAsyncStorage();
      if (storage) {
        const existingId = await storage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DEVICE_ID);
        if (existingId && existingId.trim().length > 0) {
          return existingId.trim();
        }
      }

      // Generate a new UUID v4
      let newId = '';
      const Crypto = getExpoCrypto();
      if (Crypto?.randomUUID) {
        try {
          newId = Crypto.randomUUID();
        } catch {
          // fallback
        }
      }

      if (!newId) {
        newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }

      if (storage) {
        await storage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DEVICE_ID, newId);
      }
      return newId;
    } catch (error) {
      console.warn('Error reading device ID from storage, generating fallback:', error);
      return 'fallback-device-id';
    }
  },

  /**
   * Retrieves the user-assigned backup name for this device.
   * Defaults to e.g. "My Phone", "My Tablet", or "Android Device".
   */
  async getDeviceName(): Promise<string> {
    try {
      const storage = getAsyncStorage();
      if (storage) {
        const storedName = await storage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DEVICE_NAME);
        if (storedName && storedName.trim().length > 0) {
          return storedName.trim();
        }
      }

      let defaultName = 'My Device';
      try {
        const { Platform } = require('react-native');
        if (Platform && Platform.select) {
          defaultName = Platform.select({
            ios: 'iOS Device',
            android: 'Android Device',
            web: 'Web Browser',
            default: 'My Device',
          });
        }
      } catch {
        defaultName = 'My Device';
      }

      return defaultName;
    } catch (error) {
      return 'My Device';
    }
  },

  /**
   * Updates the user-assigned backup name for this device.
   */
  async setDeviceName(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Device backup name cannot be empty');
    }
    const storage = getAsyncStorage();
    if (storage) {
      await storage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.DEVICE_NAME, trimmed);
    }
  },

  /**
   * Returns both deviceId and deviceName.
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getOrCreateDeviceId();
    const deviceName = await this.getDeviceName();
    return { deviceId, deviceName };
  },

  /**
   * Sanitizes a device display name for safe usage in file names across
   * Windows, macOS, Linux, Android, and Google Drive.
   * Replaces invalid characters [/\\?%*:|"<>~#] with underscores.
   */
  sanitizeDeviceNameForFileName(name: string): string {
    const sanitized = name
      .replace(/[\/\\?%*:|"<>~#\x00-\x1F\x7F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();

    return sanitized || 'Device';
  },
};
