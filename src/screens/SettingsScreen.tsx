import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  List,
  RadioButton,
  Card,
  useTheme,
  Button,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, useDataStore } from '../store';
import { BackupService } from '../services/BackupService';
import { LanguageCode, AppThemeMode } from '../types';
import i18n from '../translations';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;

  const { language, themeMode, setLanguage, setThemeMode } = useSettingsStore();
  const triggerRefresh = useDataStore((state) => state.triggerRefresh);

  const [langDialogVisible, setLangDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [importDialogVisible, setImportDialogVisible] = useState(false);

  const changeLanguage = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    setLangDialogVisible(false);
  };

  const handleExport = async () => {
    try {
      await BackupService.exportBackup();
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to export backup');
    }
  };

  const handleImport = async () => {
    setImportDialogVisible(false);
    try {
      const success = await BackupService.importBackup();
      if (success) {
        triggerRefresh();
        Alert.alert(t('common.success'), t('settings.importSuccess'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.importFailed'));
    }
  };

  const langLabels: Record<LanguageCode, string> = {
    en: 'English',
    te: 'తెలుగు (Telugu)',
    hi: 'हिन्दी (Hindi)',
  };

  const themeLabels: Record<AppThemeMode, string> = {
    system: t('settings.systemTheme'),
    light: t('settings.lightTheme'),
    dark: t('settings.darkTheme'),
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      {/* ── Language Section ── */}
      <List.Section>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          🌐 {t('settings.language')}
        </List.Subheader>
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.language')}
            description={langLabels[language]}
            left={(props) => <List.Icon {...props} icon="translate" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setLangDialogVisible(true)}
          />
        </Card>
      </List.Section>

      {/* ── Theme Section ── */}
      <List.Section>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          🎨 {t('settings.theme')}
        </List.Subheader>
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.theme')}
            description={themeLabels[themeMode]}
            left={(props) => <List.Icon {...props} icon="palette" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setThemeDialogVisible(true)}
          />
        </Card>
      </List.Section>

      <Divider style={styles.divider} />

      {/* ── Backup & Restore Section ── */}
      <List.Section>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          💾 {t('settings.importExport')}
        </List.Subheader>
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          {/* Export */}
          <List.Item
            title={t('settings.exportTitle')}
            description={t('settings.exportDesc')}
            left={(props) => <List.Icon {...props} icon="file-export" color={theme.colors.received} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleExport}
          />
          <Divider />
          {/* Import */}
          <List.Item
            title={t('settings.importTitle')}
            description={t('settings.importDesc')}
            left={(props) => <List.Icon {...props} icon="file-import" color={theme.colors.gave} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setImportDialogVisible(true)}
          />
        </Card>
      </List.Section>

      <Divider style={styles.divider} />

      {/* ── About ── */}
      <Card style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 6 }}>
            {t('settings.about')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
            {t('settings.aboutDesc')}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 12 }}>
            Version 1.0.0 · 100% Offline
          </Text>
        </Card.Content>
      </Card>

      {/* ── Dialogs ── */}
      <Portal>
        {/* Language Dialog */}
        <Dialog visible={langDialogVisible} onDismiss={() => setLangDialogVisible(false)}>
          <Dialog.Title>🌐 {t('settings.language')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(val) => changeLanguage(val as LanguageCode)}
              value={language}
            >
              {(['en', 'hi', 'te'] as LanguageCode[]).map((lang) => (
                <View key={lang} style={styles.radioRow}>
                  <RadioButton value={lang} />
                  <Text style={styles.radioLabel}>{langLabels[lang]}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLangDialogVisible(false)}>{t('transactions.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Theme Dialog */}
        <Dialog visible={themeDialogVisible} onDismiss={() => setThemeDialogVisible(false)}>
          <Dialog.Title>🎨 {t('settings.theme')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(val) => setThemeMode(val as AppThemeMode)}
              value={themeMode}
            >
              {(['system', 'light', 'dark'] as AppThemeMode[]).map((mode) => (
                <View key={mode} style={styles.radioRow}>
                  <RadioButton value={mode} />
                  <Text style={styles.radioLabel}>{themeLabels[mode]}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setThemeDialogVisible(false)}>{t('common.ok')}</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Import Warning Dialog */}
        <Dialog visible={importDialogVisible} onDismiss={() => setImportDialogVisible(false)}>
          <Dialog.Icon icon="alert-circle" color={theme.colors.error} />
          <Dialog.Title style={{ color: theme.colors.error }}>
            {t('settings.importTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('settings.importConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setImportDialogVisible(false)}>{t('transactions.cancel')}</Button>
            <Button onPress={handleImport} textColor={theme.colors.error}>
              {t('common.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingBottom: 48 },
  subheader: {
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 1,
    overflow: 'hidden',
  },
  divider: { marginVertical: 4, marginHorizontal: 16 },
  aboutCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
});
