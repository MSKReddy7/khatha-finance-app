import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store';
import { CustomLightTheme, CustomDarkTheme, AppTheme } from '../theme';

export const useAppTheme = (): AppTheme => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const systemColorScheme = useColorScheme();

  if (themeMode === 'dark') {
    return CustomDarkTheme;
  }
  if (themeMode === 'light') {
    return CustomLightTheme;
  }
  // Fallback to system preferences
  return systemColorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme;
};
