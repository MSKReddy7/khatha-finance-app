import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const CustomLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5', // Premium Indigo
    primaryContainer: '#EEF2FF', // Soft Indigo light background
    secondary: '#0EA5E9', // Sky blue
    secondaryContainer: '#E0F2FE', // Soft Sky
    background: '#F8FAFC', // Slate 50 (very clean background)
    surface: '#FFFFFF', // Clean White
    surfaceVariant: '#F1F5F9', // Slate 100
    error: '#EF4444', // Red 500
    success: '#10B981', // Emerald 500
    gave: '#F43F5E', // Premium Rose (Money out)
    received: '#10B981', // Premium Emerald (Money in)
    outline: '#94A3B8', // Slate 400
    text: '#0F172A', // Slate 900
    subtext: '#475569', // Slate 600
    border: '#E2E8F0', // Slate 200
  },
};

export const CustomDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8', // Indigo 400
    primaryContainer: '#1E1B4B', // Deep Indigo
    secondary: '#38BDF8', // Sky 400
    secondaryContainer: '#0C4A6E', // Deep Sky
    background: '#0B0F19', // Deep dark space slate
    surface: '#161E2E', // Slate 800 dark surface
    surfaceVariant: '#1F2937', // Slate 700 variant
    error: '#F87171', // Red 400
    success: '#34D399', // Emerald 400
    gave: '#FB7185', // Rose 400
    received: '#34D399', // Emerald 400
    outline: '#64748B', // Slate 500
    text: '#F8FAFC', // Slate 50
    subtext: '#94A3B8', // Slate 400
    border: '#334155', // Slate 600
  },
};

export type AppTheme = typeof CustomLightTheme;
export default CustomLightTheme;
