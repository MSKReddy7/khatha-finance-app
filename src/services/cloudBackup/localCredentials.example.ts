/**
 * Template for local Google Drive OAuth credentials.
 * Copy this file to `localCredentials.ts` in the same directory:
 *   cp src/services/cloudBackup/localCredentials.example.ts src/services/cloudBackup/localCredentials.ts
 *
 * Then fill in your Client ID, Client Secret, and Refresh Token.
 * Alternatively, run:
 *   node scripts/get-refresh-token.js
 * which automatically creates `localCredentials.ts` for you!
 */
export const LOCAL_CREDENTIALS = {
  clientId: 'YOUR_GOOGLE_DESKTOP_CLIENT_ID.apps.googleusercontent.com',
  clientSecret: 'YOUR_GOOGLE_DESKTOP_CLIENT_SECRET',
  refreshToken: 'YOUR_GENERATED_REFRESH_TOKEN',
  expoGoClientId: 'OPTIONAL_WEB_CLIENT_ID.apps.googleusercontent.com',
};
