import { create } from 'zustand';
import { CloudBackupItem, SyncStatus } from '../services/cloudBackup/types';

interface CloudBackupState {
  status: SyncStatus;
  statusMessage: string | null;
  isConnected: boolean;
  userEmail: string | null;
  deviceId: string;
  deviceName: string;
  lastBackupTime: string | null;
  lastBackupHash: string | null;
  isPending: boolean;
  backups: CloudBackupItem[];
  isLoadingBackups: boolean;
  clientId: string;

  // Actions
  setStatus: (status: SyncStatus, statusMessage?: string | null) => void;
  setConnected: (isConnected: boolean, userEmail?: string | null) => void;
  setDeviceInfo: (deviceId: string, deviceName: string) => void;
  setDeviceName: (deviceName: string) => void;
  setLastBackup: (lastBackupTime: string, lastBackupHash: string) => void;
  setPending: (isPending: boolean) => void;
  setBackups: (backups: CloudBackupItem[]) => void;
  setLoadingBackups: (isLoadingBackups: boolean) => void;
  setClientId: (clientId: string) => void;
}

export const useCloudBackupStore = create<CloudBackupState>((set) => ({
  status: 'idle',
  statusMessage: null,
  isConnected: false,
  userEmail: null,
  deviceId: '',
  deviceName: 'My Device',
  lastBackupTime: null,
  lastBackupHash: null,
  isPending: false,
  backups: [],
  isLoadingBackups: false,
  clientId: '',

  setStatus: (status, statusMessage = null) => set({ status, statusMessage }),
  setConnected: (isConnected, userEmail = null) => set({ isConnected, userEmail }),
  setDeviceInfo: (deviceId, deviceName) => set({ deviceId, deviceName }),
  setDeviceName: (deviceName) => set({ deviceName }),
  setLastBackup: (lastBackupTime, lastBackupHash) => set({ lastBackupTime, lastBackupHash, isPending: false }),
  setPending: (isPending) => set({ isPending }),
  setBackups: (backups) => set({ backups }),
  setLoadingBackups: (isLoadingBackups) => set({ isLoadingBackups }),
  setClientId: (clientId) => set({ clientId }),
}));
