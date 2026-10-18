import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { useSettingsStore } from './src/store';
import { initDatabase } from './src/database/sqlite';
import { useAppTheme } from './src/hooks/useAppTheme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CloudBackupManager } from './src/services/cloudBackup/CloudBackupManager';
import i18n from './src/translations';

// Keep the splash screen visible while we finish loading
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Failed to initialize database on startup:', e);
      } finally {
        setAppReady(true);
        SplashScreen.hideAsync().catch(() => {});
        CloudBackupManager.initialize();
      }
    }
    prepare();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A1628', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return <AppContent />;
}
