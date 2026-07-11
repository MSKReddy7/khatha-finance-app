import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode, AppThemeMode } from '../types';

interface SettingsState {
  language: LanguageCode;
  themeMode: AppThemeMode;
  setLanguage: (lang: LanguageCode) => void;
  setThemeMode: (theme: AppThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      themeMode: 'system',
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
    }),
    {
      name: 'khatha-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

interface DataState {
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
export default useDataStore;
