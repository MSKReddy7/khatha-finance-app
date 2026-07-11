import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { useSettingsStore } from './src/store';
import { initDatabase } from './src/database/sqlite';
import { useAppTheme } from './src/hooks/useAppTheme';
import { AppNavigator } from './src/navigation/AppNavigator';
import i18n from './src/translations';

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
  return (
    <SQLiteProvider databaseName="khatha.db" onInit={initDatabase}>
      <AppContent />
    </SQLiteProvider>
  );
}
