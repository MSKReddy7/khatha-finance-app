# UI and Color Fixes Plan

## Overview
Update the Expo application to improve UI and color scheme for a finance management app, and add a Reports screen to the bottom tab navigation.

## Changes

### 1. Theme Updates (`src/theme/index.ts`)
- Update light and dark color palettes to better suit a finance app:
  - Primary: strong blue (#1565C0 light, #90CAF9 dark)
  - PrimaryContainer: light blue (#E3F2FD light, #1565C0 dark)
  - Secondary: teal (#009688 light, #80CBC4 dark) (unchanged)
  - SecondaryContainer: light teal (#E0F2F1 light, #004D40 dark)
  - Background: light gray (#F5F5F5 light, #0D0D0D dark)
  - Surface: white (#FFFFFF light, #121212 dark)
  - SurfaceVariant: slightly lighter gray (#EEEEEE light, #1F1F1F dark)
  - Error/SUCCESS: keep existing red/green shades
  - Gave/Received: keep error/success colors for consistency
  - Outline: medium gray (#B0BEC5 light, #424242 dark)
  - Text: dark gray (#212121 light, #EEEEEE dark)
  - Subtext: medium gray (#424242 light, #B0BEC5 dark)
  - Border: light gray (#E0E0E0 light, #424242 dark)

### 2. Navigation Updates (`src/navigation/AppNavigator.tsx`)
- Import `ReportsScreen` from `../screens/ReportsScreen`.
- Update `TabParamList` in `src/types/index.ts` (already done) to include `Reports: undefined`.
- Add a `<Tab.Screen>` for Reports with:
  - name: "Reports"
  - component: ReportsScreen
  - options: { tabBarLabel: t('reports.title') } (assuming translation key exists)
- Update `tabBarIcon` callback to show appropriate icons:
  - BooksTab: 'book-multiple'
  - Reports: 'bar-chart' (or 'chart-bar')
  - Settings: 'cog'
- Keep existing tab bar styling.

### 3. Ensure ReportsScreen Uses Theme Colors
- No changes needed as it already consumes `theme.colors`.

### 4. Optional: Verify ReportsScreen Content
- Ensure the screen displays financial summaries correctly using the updated colors.

## Steps
1. Edit `src/theme/index.ts` with new color values.
2. Edit `src/types/index.ts` (already done) to add Reports tab.
3. Edit `src/navigation/AppNavigator.tsx` to import ReportsScreen, add tab screen, and update icon logic.
4. (Optional) Run the app to verify changes.

## Files to Modify
- src/theme/index.ts
- src/types/index.ts (already modified)
- src/navigation/AppNavigator.tsx
