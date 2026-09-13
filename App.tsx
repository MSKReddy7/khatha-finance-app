import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { useSettingsStore } from './src/store';
import { initDatabase } from './src/database/sqlite';
import { useAppTheme } from './src/hooks/useAppTheme';
import { AppNavigator } from './src/navigation/AppNavigator';
import i18n from './src/translations';

// Keep the splash screen visible while we finish loading
SplashScreen.preventAutoHideAsync();

// App content wrapper that consumes context, hooks and navigation
const AppContent = () => {
  const theme = useAppTheme();
  const language = useSettingsStore((state) => state.language);
  const themeMode = useSettingsStore((state) => state.themeMode);

  // Sync stored language preference with i18n instance
  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
    </PaperProvider>
  );
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  const onInit = useCallback(async (db: any) => {
    await initDatabase(db);
    setDbReady(true);
  }, []);

  useEffect(() => {
    if (dbReady) {
      // Hide splash screen once the app is ready
      SplashScreen.hideAsync();
    }
  }, [dbReady]);

  return (
    <SQLiteProvider databaseName="khatha.db" onInit={onInit}>
      <AppContent />
    </SQLiteProvider>
  );
}
