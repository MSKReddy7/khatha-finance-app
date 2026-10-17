import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_BACKUP_CONFIG } from './config';
import { AuthTokens, GoogleUserInfo } from './types';

// Complete any pending auth sessions on web/mobile
WebBrowser.maybeCompleteAuthSession();

export const GoogleAuthService = {
  /**
   * Safe SecureStore wrapper with web fallback.
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`Failed to read secure key ${key}:`, e);
      return null;
    }
  },

  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`Failed to set secure key ${key}:`, e);
    }
  },

  async deleteSecureItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`Failed to delete secure key ${key}:`, e);
    }
  },

  /**
   * Retrieves configured Google OAuth Client ID.
   * Priority: AsyncStorage -> config.SHARED_CREDENTIALS -> config.DEFAULT_CLIENT_ID
   */
  async getClientId(): Promise<string> {
    try {
      const customId = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_CLIENT_ID);
      if (customId && customId.trim()) {
        return customId.trim();
      }
    } catch (e) {
      // ignore
    }
    return (
      CLOUD_BACKUP_CONFIG.SHARED_CREDENTIALS.CLIENT_ID ||
      CLOUD_BACKUP_CONFIG.DEFAULT_CLIENT_ID ||
      ''
    );
  },

  async setClientId(clientId: string): Promise<void> {
    await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_CLIENT_ID, clientId.trim());
  },

  /**
   * Retrieves configured Google OAuth Client Secret (if any).
   * Priority: AsyncStorage -> config.SHARED_CREDENTIALS
   */
  async getClientSecret(): Promise<string> {
    try {
      const customSecret = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_CLIENT_SECRET);
      if (customSecret && customSecret.trim()) {
        return customSecret.trim();
      }
    } catch (e) {
      // ignore
    }
    return CLOUD_BACKUP_CONFIG.SHARED_CREDENTIALS.CLIENT_SECRET || '';
  },

  async setClientSecret(secret: string): Promise<void> {
    await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_CLIENT_SECRET, secret.trim());
  },

  /**
   * Retrieves the effective Refresh Token.
   * Priority: SecureStore -> AsyncStorage -> config.SHARED_CREDENTIALS
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const stored = await this.getSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.REFRESH_TOKEN);
      if (stored && stored.trim()) {
        return stored.trim();
      }
      const asyncStored = await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_REFRESH_TOKEN);
      if (asyncStored && asyncStored.trim()) {
        return asyncStored.trim();
      }
    } catch (e) {
      // ignore
    }

    if (CLOUD_BACKUP_CONFIG.SHARED_CREDENTIALS.REFRESH_TOKEN?.trim()) {
      return CLOUD_BACKUP_CONFIG.SHARED_CREDENTIALS.REFRESH_TOKEN.trim();
    }

    return null;
  },

  async setRefreshToken(refreshToken: string): Promise<void> {
    const trimmed = refreshToken.trim();
    await this.setSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.REFRESH_TOKEN, trimmed);
    await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_REFRESH_TOKEN, trimmed);
  },

  /**
   * Checks if pre-configured shared credentials (zero-touch mode) are available.
   */
  async isZeroTouchConfigured(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    const clientId = await this.getClientId();
    return !!(refreshToken && clientId);
  },

  /**
   * Generates redirect URI.
   */
  getRedirectUri(): string {
    return AuthSession.makeRedirectUri({
      scheme: 'khathafinance',
      path: 'oauthredirect',
    });
  },

  /**
   * Performs interactive OAuth 2.0 authorization code flow with PKCE (optional manual fallback).
   */
  async promptLogin(customClientId?: string): Promise<{ success: boolean; error?: string; tokens?: AuthTokens }> {
    try {
      const clientId = customClientId || (await this.getClientId());
      if (!clientId) {
        return {
          success: false,
          error: 'Google Cloud Client ID is not configured. Please enter your OAuth Client ID in Cloud Backup Settings.',
        };
      }

      const redirectUri = this.getRedirectUri();

      const authRequest = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: CLOUD_BACKUP_CONFIG.SCOPES,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const discovery: AuthSession.DiscoveryDocument = {
        authorizationEndpoint: CLOUD_BACKUP_CONFIG.AUTH_ENDPOINT,
        tokenEndpoint: CLOUD_BACKUP_CONFIG.TOKEN_ENDPOINT,
        revocationEndpoint: CLOUD_BACKUP_CONFIG.REVOKE_ENDPOINT,
        userInfoEndpoint: CLOUD_BACKUP_CONFIG.USERINFO_ENDPOINT,
      };

      const result = await authRequest.promptAsync(discovery);

      if (result.type !== 'success' || !result.params.code) {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { success: false, error: 'Authentication was cancelled' };
        }
        return { success: false, error: 'Failed to receive authorization code from Google' };
      }

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: authRequest.codeVerifier || '',
          },
        },
        discovery
      );

      const expiresAt = Date.now() + (tokenResult.expiresIn || 3600) * 1000;
      const tokens: AuthTokens = {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt,
        tokenType: tokenResult.tokenType || 'Bearer',
        scope: tokenResult.scope || '',
      };

      await this.saveTokens(tokens);

      const userInfo = await this.fetchUserInfo(tokens.accessToken);
      if (userInfo?.email) {
        await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.AUTHORIZED_EMAIL, userInfo.email);
      }

      return { success: true, tokens };
    } catch (error: any) {
      console.error('Google login error:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  },

  /**
   * Saves tokens securely in SecureStore.
   */
  async saveTokens(tokens: AuthTokens): Promise<void> {
    await this.setSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    if (tokens.refreshToken) {
      await this.setSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
    await this.setSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.TOKEN_EXPIRY, String(tokens.expiresAt));
  },

  /**
   * Retrieves a valid access token.
   * If not present or expired, automatically refreshes in the background using the configured refresh token.
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const accessToken = await this.getSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.ACCESS_TOKEN);
      const expiryStr = await this.getSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.TOKEN_EXPIRY);
      const expiresAt = expiryStr ? parseInt(expiryStr, 10) : 0;

      // If valid for at least another 60 seconds, reuse it
      if (accessToken && Date.now() < expiresAt - 60000) {
        return accessToken;
      }

      // Need to obtain or refresh access token using the effective refresh token
      const refreshToken = await this.getRefreshToken();
      if (refreshToken) {
        console.log('Fetching/refreshing Google Drive access token using refresh token...');
        const refreshed = await this.refreshAccessToken(refreshToken);
        if (refreshed?.accessToken) {
          return refreshed.accessToken;
        }
      }

      return null;
    } catch (e) {
      console.error('Error getting valid access token:', e);
      return null;
    }
  },

  /**
   * Refreshes access token using refresh_token and client credentials.
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const clientId = await this.getClientId();
      if (!clientId) {
        return null;
      }

      const clientSecret = await this.getClientSecret();

      const params: Record<string, string> = {
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      };

      if (clientSecret) {
        params.client_secret = clientSecret;
      }

      const body = new URLSearchParams(params).toString();

      const response = await fetch(CLOUD_BACKUP_CONFIG.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('Failed to refresh access token:', errText);
        return null;
      }

      const data = await response.json();
      const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      const newTokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope || '',
      };

      await this.saveTokens(newTokens);

      // Fetch user profile info if not stored yet
      const existingEmail = await this.getAuthorizedEmail();
      if (!existingEmail) {
        const info = await this.fetchUserInfo(newTokens.accessToken);
        if (info?.email) {
          await AsyncStorage.setItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.AUTHORIZED_EMAIL, info.email);
        }
      }

      return newTokens;
    } catch (error) {
      console.error('Exception refreshing access token:', error);
      return null;
    }
  },

  /**
   * Fetches the Google User Profile Info (email, name).
   */
  async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
    try {
      const response = await fetch(CLOUD_BACKUP_CONFIG.USERINFO_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    } catch (e) {
      console.warn('Failed to fetch user info:', e);
      return null;
    }
  },

  /**
   * Returns whether the app is authenticated (either via pre-configured shared token or active session).
   */
  async isAuthenticated(): Promise<boolean> {
    const hasZeroTouch = await this.isZeroTouchConfigured();
    if (hasZeroTouch) {
      return true;
    }
    const token = await this.getValidAccessToken();
    return !!token;
  },

  /**
   * Gets the stored authorized Google email address.
   */
  async getAuthorizedEmail(): Promise<string | null> {
    return await AsyncStorage.getItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.AUTHORIZED_EMAIL);
  },

  /**
   * Clears tokens and signs out locally.
   */
  async signOut(): Promise<void> {
    await this.deleteSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.ACCESS_TOKEN);
    await this.deleteSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.REFRESH_TOKEN);
    await this.deleteSecureItem(CLOUD_BACKUP_CONFIG.SECURE_KEYS.TOKEN_EXPIRY);
    await AsyncStorage.removeItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.CUSTOM_REFRESH_TOKEN);
    await AsyncStorage.removeItem(CLOUD_BACKUP_CONFIG.STORAGE_KEYS.AUTHORIZED_EMAIL);
  },
};
