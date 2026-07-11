import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const CustomLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0', // Strong blue
    primaryContainer: '#E3F2FD', // Light blue
    secondary: '#009688', // Teal
    secondaryContainer: '#E0F2F1', // Light teal
    background: '#F5F5F5', // Light gray
    surface: '#FFFFFF', // White
    surfaceVariant: '#EEEEEE', // Slightly lighter gray
    error: '#D32F2F', // Red
    success: '#2E7D32', // Green
    gave: '#D32F2F', // Money Out (Red)
    received: '#2E7D32', // Money In (Green)
    outline: '#B0BEC5', // Medium gray
    text: '#212121', // Dark gray
    subtext: '#424242', // Medium gray
    border: '#E0E0E0', // Light gray
  },
};

export const CustomDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90CAF9', // Strong blue (lighter for dark mode)
    primaryContainer: '#1565C0', // Strong blue (darker for container)
    secondary: '#80CBC4', // Soft teal
    secondaryContainer: '#004D40', // Dark teal
    background: '#0D0D0D', // Dark gray
    surface: '#121212', // Slightly lighter dark gray
    surfaceVariant: '#1F1F1F', // Lighter dark gray
    error: '#EF5350', // Soft red
    success: '#66BB6A', // Soft green
    gave: '#EF5350', // Soft Red
    received: '#66BB6A', // Soft Green
    outline: '#424242', // Medium dark gray
    text: '#EEEEEE', // Light gray
    subtext: '#B0BEC5', // Light medium gray
    border: '#424242', // Medium dark gray
  },
};

export type AppTheme = typeof CustomLightTheme;
export default CustomLightTheme;
