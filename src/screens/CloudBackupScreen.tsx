import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Chip,
  Divider,
  Portal,
  Dialog,
  TextInput,
  useTheme,
  Banner,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useCloudBackupStore } from '../store/cloudBackupStore';
import { CloudBackupManager } from '../services/cloudBackup/CloudBackupManager';
import { GoogleAuthService } from '../services/cloudBackup/GoogleAuthService';
import { DeviceIdentity } from '../services/cloudBackup/DeviceIdentity';
import { CloudBackupItem } from '../services/cloudBackup/types';
import dayjs from 'dayjs';

export const CloudBackupScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const {
    status,
    statusMessage,
    isConnected,
    userEmail,
    deviceId,
    deviceName,
    lastBackupTime,
    isPending,
    backups,
    isLoadingBackups,
    clientId,
  } = useCloudBackupStore();

  // Dialog states
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState(deviceName);

  // Credentials dialog states
  const [credentialsDialogVisible, setCredentialsDialogVisible] = useState(false);
  const [inputClientId, setInputClientId] = useState(clientId);
  const [inputClientSecret, setInputClientSecret] = useState('');
  const [inputRefreshToken, setInputRefreshToken] = useState('');

  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<CloudBackupItem | null>(null);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<CloudBackupItem | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Initialize and load list on mount
  useEffect(() => {
    CloudBackupManager.initialize();
  }, []);

  // Refresh backup list whenever screen gains focus
  useEffect(() => {
    if (isFocused && isConnected) {
      CloudBackupManager.refreshBackupsList().catch(() => {});
    }
  }, [isFocused, isConnected]);

  useEffect(() => {
    setNewDeviceName(deviceName);
  }, [deviceName]);

  const onRefresh = useCallback(async () => {
    if (isConnected) {
      await CloudBackupManager.refreshBackupsList();
    }
  }, [isConnected]);

  // Open credentials dialog and load stored values
  const openCredentialsDialog = async () => {
    const id = await GoogleAuthService.getClientId();
    const secret = await GoogleAuthService.getClientSecret();
    const token = (await GoogleAuthService.getRefreshToken()) || '';
    setInputClientId(id);
    setInputClientSecret(secret);
    setInputRefreshToken(token);
    setCredentialsDialogVisible(true);
  };

  // Save credentials (Client ID, Client Secret, Refresh Token)
  const handleSaveCredentials = async () => {
    try {
      if (inputClientId.trim()) {
        await GoogleAuthService.setClientId(inputClientId.trim());
        useCloudBackupStore.getState().setClientId(inputClientId.trim());
      }
      if (inputClientSecret.trim()) {
        await GoogleAuthService.setClientSecret(inputClientSecret.trim());
      }
      if (inputRefreshToken.trim()) {
        await GoogleAuthService.setRefreshToken(inputRefreshToken.trim());
      }
      setCredentialsDialogVisible(false);
      setIsActionLoading(true);

      await CloudBackupManager.initialize();
      const authed = await GoogleAuthService.isAuthenticated();
      if (authed) {
        await CloudBackupManager.refreshBackupsList();
        Alert.alert(t('common.success'), 'Drive credentials saved! Cloud sync is now active.');
      } else {
        Alert.alert('Saved', 'Credentials updated.');
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to save credentials');
    } finally {
      setIsActionLoading(false);
    }
  };


  // Sign out / Disconnect
  const handleSignOut = () => {
    Alert.alert(
      t('cloudBackup.disconnectConfirmTitle'),
      t('cloudBackup.disconnectConfirmMessage'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('cloudBackup.disconnect'),
          style: 'destructive',
          onPress: async () => {
            await GoogleAuthService.signOut();
            useCloudBackupStore.getState().setConnected(false, null);
            useCloudBackupStore.getState().setBackups([]);
          },
        },
      ]
    );
  };

  // Save new device name
  const handleSaveDeviceName = async () => {
    if (!newDeviceName.trim()) return;
    try {
      await DeviceIdentity.setDeviceName(newDeviceName.trim());
      useCloudBackupStore.getState().setDeviceName(newDeviceName.trim());
      setEditNameVisible(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to update device name');
    }
  };

  // Manual Backup Now
  const handleBackupNow = async () => {
    if (!isConnected) {
      openCredentialsDialog();
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await CloudBackupManager.performBackup('manual');
      if (res.success) {
        Alert.alert(t('common.success'), t('cloudBackup.backupSuccess'));
      } else if (res.error) {
        Alert.alert(t('common.error'), res.error);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirm Restore
  const promptRestore = (backup: CloudBackupItem) => {
    setSelectedBackupForRestore(backup);
    setRestoreConfirmVisible(true);
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    const backup = selectedBackupForRestore;
    setRestoreConfirmVisible(false);
    setIsActionLoading(true);

    try {
      const res = await CloudBackupManager.restoreBackup(backup.id);
      if (res.success) {
        Alert.alert(
          t('common.success'),
          t('cloudBackup.restoreSuccessMessage', { id: backup.backupId, device: backup.deviceName }),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.error'), res.error || t('cloudBackup.restoreFailedMessage'));
      }
    } finally {
      setIsActionLoading(false);
      setSelectedBackupForRestore(null);
    }
  };

  // Confirm Delete
  const promptDelete = (backup: CloudBackupItem) => {
    setSelectedBackupForDelete(backup);
    setDeleteConfirmVisible(true);
  };

  const handleExecuteDelete = async () => {
    if (!selectedBackupForDelete) return;
    const backupId = selectedBackupForDelete.id;
    setDeleteConfirmVisible(false);
    setIsActionLoading(true);

    try {
      const success = await CloudBackupManager.deleteBackup(backupId);
      if (success) {
        Alert.alert(t('common.success'), t('cloudBackup.deleteSuccess'));
      } else {
        Alert.alert(t('common.error'), t('cloudBackup.deleteFailed'));
      }
    } finally {
      setIsActionLoading(false);
      setSelectedBackupForDelete(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDisplayTime = (isoString: string) => {
    try {
      const d = dayjs(isoString);
      return `${d.format('DD MMM YYYY, hh:mm A')} (${Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'})`;
    } catch {
      return isoString;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoadingBackups} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* ── Status Banner (When syncing, uploading, or offline) ── */}
      {statusMessage && (
        <Banner
          visible={true}
          actions={[]}
          icon={status === 'error' ? 'alert-circle' : status === 'offline' ? 'cloud-off-outline' : 'cloud-sync'}
          style={[
            styles.banner,
            {
              backgroundColor:
                status === 'error'
                  ? theme.colors.errorContainer
                  : status === 'offline'
                  ? theme.colors.surfaceVariant
                  : theme.colors.primaryContainer,
            },
          ]}
        >
          <Text
            variant="bodyMedium"
            style={{
              color:
                status === 'error'
                  ? theme.colors.onErrorContainer
                  : status === 'offline'
                  ? theme.colors.onSurfaceVariant
                  : theme.colors.onPrimaryContainer,
              fontWeight: '600',
            }}
          >
            {statusMessage}
          </Text>
        </Banner>
      )}

      {/* ── Google Drive Connection Card ── */}
      <Card
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isConnected ? '#0F9D58' : theme.colors.border,
            borderWidth: isConnected ? 1.5 : 1,
          },
        ]}
        elevation={0}
      >
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <IconButton icon="google-drive" iconColor={isConnected ? '#0F9D58' : theme.colors.outline} size={30} />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
                  {isConnected ? 'Google Drive (Family Cloud)' : t('cloudBackup.googleDriveTitle')}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{
                    color: isConnected ? '#0F9D58' : theme.colors.outline,
                    fontWeight: isConnected ? '700' : '500',
                  }}
                >
                  {isConnected
                    ? `✓ Connected ${userEmail ? `(${userEmail})` : '· Zero-Touch Sync'}`
                    : 'Credentials needed for zero-touch sync'}
                </Text>
              </View>
            </View>
            <Chip
              mode="flat"
              textStyle={{ fontSize: 11, fontWeight: '700', color: isConnected ? '#0F9D58' : undefined }}
              style={{
                backgroundColor: isConnected ? '#E6F4EA' : theme.colors.surfaceVariant,
              }}
            >
              {isConnected ? 'Active' : 'Setup Needed'}
            </Chip>
          </View>

          {/* Shared Family Disclaimer */}
          <View style={[styles.disclaimerBox, { backgroundColor: theme.colors.background }]}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, lineHeight: 18, fontSize: 11 }}>
              ℹ️ {t('cloudBackup.familySharedDisclaimer')}
            </Text>
          </View>

          <Divider style={{ marginVertical: 12, backgroundColor: theme.colors.border }} />

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            {isConnected ? (
              <>
                <Button
                  mode="contained"
                  icon="cloud-upload"
                  loading={isActionLoading && status === 'uploading'}
                  disabled={isActionLoading}
                  style={{ flex: 2, marginRight: 8 }}
                  onPress={handleBackupNow}
                >
                  {t('cloudBackup.backUpNow')}
                </Button>
                <Button
                  mode="outlined"
                  icon="cog"
                  style={{ flex: 1 }}
                  onPress={openCredentialsDialog}
                >
                  Credentials
                </Button>
              </>
            ) : (
              <Button
                mode="contained"
                icon="key"
                style={{ flex: 1 }}
                onPress={openCredentialsDialog}
              >
                Enter Credentials
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* ── Device Identity Card ── */}
      <Card
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
        ]}
        elevation={0}
      >
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.outline, textTransform: 'uppercase' }}>
                {t('cloudBackup.thisDeviceName')}
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.onSurface, marginTop: 2 }}>
                {deviceName}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 10, marginTop: 2 }}>
                ID: {deviceId}
              </Text>
            </View>
            <IconButton
              icon="pencil-outline"
              iconColor={theme.colors.primary}
              onPress={() => setEditNameVisible(true)}
            />
          </View>

          <Divider style={{ marginVertical: 10, backgroundColor: theme.colors.border }} />

          <View style={styles.metaRow}>
            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {t('cloudBackup.lastCloudBackup')}
              </Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, marginTop: 2 }}>
                {lastBackupTime ? formatDisplayTime(lastBackupTime) : t('cloudBackup.never')}
              </Text>
            </View>
            {isPending && (
              <Chip icon="clock-outline" style={{ backgroundColor: '#FEF3C7' }}>
                {t('cloudBackup.pendingSync')}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* ── Available Backups Section ── */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
            📁 {t('cloudBackup.availableBackups')} ({backups.length})
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            {t('cloudBackup.backupsListSubtitle')}
          </Text>
        </View>
        <IconButton
          icon="refresh"
          iconColor={theme.colors.primary}
          loading={isLoadingBackups}
          onPress={onRefresh}
        />
      </View>

      {!isConnected ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Card.Content style={styles.emptyContent}>
            <IconButton icon="cloud-off-outline" size={40} iconColor={theme.colors.outline} />
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.outline, marginTop: 8 }}>
              Configure credentials to view family cloud backups
            </Text>
            <Button
              mode="contained"
              icon="key"
              style={{ marginTop: 12 }}
              onPress={openCredentialsDialog}
            >
              Configure Credentials
            </Button>
          </Card.Content>
        </Card>
      ) : backups.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Card.Content style={styles.emptyContent}>
            <IconButton icon="cloud-search-outline" size={40} iconColor={theme.colors.outline} />
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.outline, marginTop: 8 }}>
              {t('cloudBackup.noBackupsFound')}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 4 }}>
              {t('cloudBackup.tapBackUpToCreate')}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        backups.map((item) => (
          <Card
            key={item.id}
            style={[
              styles.backupItemCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: item.isCurrentDevice ? theme.colors.primary : theme.colors.border,
                borderWidth: item.isCurrentDevice ? 1.5 : 1,
              },
            ]}
            elevation={0}
          >
            <Card.Content>
              <View style={styles.backupCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.idBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.idBadgeText, { color: theme.colors.onPrimaryContainer }]}>
                      #{item.backupId}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      variant="titleSmall"
                      style={{ fontWeight: '800', color: theme.colors.onSurface }}
                      numberOfLines={1}
                    >
                      {item.deviceName}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 11 }}>
                      {formatDisplayTime(item.createdTime)}
                    </Text>
                  </View>
                </View>

                {item.isCurrentDevice && (
                  <Chip
                    mode="flat"
                    textStyle={{ fontSize: 10, fontWeight: '700' }}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  >
                    {t('cloudBackup.thisDeviceBadge')}
                  </Chip>
                )}
              </View>

              <View style={styles.backupMetaRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 11 }}>
                  💾 {formatFileSize(item.size)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 10 }} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>

              <Divider style={{ marginVertical: 10, backgroundColor: theme.colors.border }} />

              <View style={styles.backupActionsRow}>
                <Button
                  mode="outlined"
                  icon="trash-can-outline"
                  textColor={theme.colors.error}
                  style={{ borderColor: theme.colors.error, marginRight: 8 }}
                  compact
                  onPress={() => promptDelete(item)}
                >
                  {t('common.delete', { defaultValue: 'Delete' })}
                </Button>
                <Button
                  mode="contained"
                  icon="restore"
                  style={{ flex: 1 }}
                  compact
                  onPress={() => promptRestore(item)}
                >
                  {t('cloudBackup.restoreThisBackup')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      {/* ── Dialog: Edit Device Name ── */}
      <Portal>
        <Dialog
          visible={editNameVisible}
          onDismiss={() => setEditNameVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800' }}>📱 {t('cloudBackup.editDeviceName')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 12 }}>
              {t('cloudBackup.editDeviceNameDesc')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('cloudBackup.deviceNameLabel')}
              value={newDeviceName}
              onChangeText={setNewDeviceName}
              placeholder="e.g. Manoj Phone, Shop Tablet"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditNameVisible(false)}>{t('transactions.cancel')}</Button>
            <Button onPress={handleSaveDeviceName} mode="contained">
              {t('transactions.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* ── Dialog: Configure Drive Credentials (Zero-Touch Mode) ── */}
        <Dialog
          visible={credentialsDialogVisible}
          onDismiss={() => setCredentialsDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800' }}>🔑 Google Drive Credentials</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 12, lineHeight: 18 }}>
              Configure credentials once. All family devices will automatically back up and restore without any Google login prompt.
            </Text>
            <TextInput
              mode="outlined"
              label="OAuth Client ID"
              value={inputClientId}
              onChangeText={setInputClientId}
              placeholder="e.g. 7068818...apps.googleusercontent.com"
              style={{ marginBottom: 10 }}
            />
            <TextInput
              mode="outlined"
              label="Client Secret (Optional/Web)"
              value={inputClientSecret}
              onChangeText={setInputClientSecret}
              placeholder="e.g. GOCSPX-..."
              secureTextEntry
              style={{ marginBottom: 10 }}
            />
            <TextInput
              mode="outlined"
              label="Central Account Refresh Token"
              value={inputRefreshToken}
              onChangeText={setInputRefreshToken}
              placeholder="e.g. 1//0g..."
              secureTextEntry
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCredentialsDialogVisible(false)}>{t('transactions.cancel')}</Button>
            <Button onPress={handleSaveCredentials} mode="contained">
              {t('transactions.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* ── Dialog: Restore Confirmation (CRITICAL REPLACE WARNING) ── */}
        <Dialog
          visible={restoreConfirmVisible}
          onDismiss={() => setRestoreConfirmVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800', color: theme.colors.error }}>
            ⚠️ {t('cloudBackup.confirmRestoreTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 22 }}>
              {t('cloudBackup.confirmRestoreWarning', {
                id: selectedBackupForRestore?.backupId,
                device: selectedBackupForRestore?.deviceName,
              })}
            </Text>
            <View style={[styles.replaceWarningBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
              <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>
                🚨 {t('cloudBackup.replaceWarningNote')}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRestoreConfirmVisible(false)}>{t('transactions.cancel')}</Button>
            <Button
              onPress={handleExecuteRestore}
              mode="contained"
              buttonColor={theme.colors.error}
              textColor="#FFFFFF"
            >
              {t('cloudBackup.confirmReplaceButton')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* ── Dialog: Delete Confirmation ── */}
        <Dialog
          visible={deleteConfirmVisible}
          onDismiss={() => setDeleteConfirmVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800' }}>🗑️ {t('cloudBackup.confirmDeleteTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {t('cloudBackup.confirmDeleteMessage', {
                id: selectedBackupForDelete?.backupId,
                device: selectedBackupForDelete?.deviceName,
              })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirmVisible(false)}>{t('transactions.cancel')}</Button>
            <Button
              onPress={handleExecuteDelete}
              mode="contained"
              buttonColor={theme.colors.error}
              textColor="#FFFFFF"
            >
              {t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    borderRadius: 12,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disclaimerBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupItemCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  backupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idBadgeText: {
    fontWeight: '800',
    fontSize: 13,
  },
  backupMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  backupActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  replaceWarningBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
});
