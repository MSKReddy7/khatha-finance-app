import React, { useState, useEffect } from 'react';
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
  IconButton,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { useSettingsStore, useDataStore } from '../store';
import { BackupService } from '../services/BackupService';
import { DatabaseService } from '../services/DatabaseService';
import { LanguageCode, AppThemeMode, Book } from '../types';
import i18n from '../translations';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;

  const { language, themeMode, setLanguage, setThemeMode } = useSettingsStore();
  const triggerRefresh = useDataStore((state) => state.triggerRefresh);
  const refreshKey = useDataStore((state) => state.refreshKey);
  const isFocused = useIsFocused();

  const [langDialogVisible, setLangDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [importDialogVisible, setImportDialogVisible] = useState(false);
  const [archivedBooks, setArchivedBooks] = useState<Book[]>([]);

  const loadArchivedBooks = async () => {
    try {
      const data = await DatabaseService.getBooks(true);
      setArchivedBooks(data);
    } catch (error) {
      console.error('Failed to load archived books:', error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadArchivedBooks();
    }
  }, [isFocused, refreshKey]);

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
      <List.Section style={styles.listSection}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          🌐 {t('settings.language')}
        </List.Subheader>
        <Card
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
          elevation={0}
        >
          <List.Item
            title={t('settings.language')}
            description={langLabels[language]}
            descriptionStyle={{ color: theme.colors.outline, fontWeight: '600' }}
            left={(props) => <List.Icon {...props} icon="translate" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.outline} />}
            onPress={() => setLangDialogVisible(true)}
          />
        </Card>
      </List.Section>

      {/* ── Theme Section ── */}
      <List.Section style={styles.listSection}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          🎨 {t('settings.theme')}
        </List.Subheader>
        <Card
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
          elevation={0}
        >
          <List.Item
            title={t('settings.theme')}
            description={themeLabels[themeMode]}
            descriptionStyle={{ color: theme.colors.outline, fontWeight: '600' }}
            left={(props) => <List.Icon {...props} icon="palette" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.outline} />}
            onPress={() => setThemeDialogVisible(true)}
          />
        </Card>
      </List.Section>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* ── Archived Books Section ── */}
      <List.Section style={styles.listSection}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          📦 {t('settings.archivedBooks')}
        </List.Subheader>
        <Card
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
          elevation={0}
        >
          {archivedBooks.length === 0 ? (
            <List.Item
              title={t('settings.noArchivedBooks')}
              titleStyle={{ color: theme.colors.outline, fontSize: 14 }}
              left={(props) => <List.Icon {...props} icon="archive-outline" color={theme.colors.outline} />}
            />
          ) : (
            archivedBooks.map((book) => (
              <List.Item
                key={book.id}
                title={book.name}
                titleStyle={{ fontWeight: '700' }}
                description={book.description || undefined}
                descriptionStyle={{ color: theme.colors.outline }}
                left={(props) => <List.Icon {...props} icon="book-remove" color={theme.colors.outline} />}
                right={(props) => (
                  <IconButton
                    icon="archive-arrow-up"
                    iconColor={theme.colors.primary}
                    onPress={async () => {
                      await DatabaseService.restoreBook(book.id);
                      triggerRefresh();
                    }}
                  />
                )}
              />
            ))
          )}
        </Card>
      </List.Section>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* ── Backup & Restore Section ── */}
      <List.Section style={styles.listSection}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>
          💾 {t('settings.importExport')}
        </List.Subheader>
        <Card
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
          elevation={0}
        >
          {/* Export */}
          <List.Item
            title={t('settings.exportTitle')}
            description={t('settings.exportDesc')}
            descriptionStyle={{ color: theme.colors.outline }}
            left={(props) => <List.Icon {...props} icon="file-export" color={theme.colors.received} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.outline} />}
            onPress={handleExport}
          />
          <Divider style={{ backgroundColor: theme.colors.border }} />
          {/* Import */}
          <List.Item
            title={t('settings.importTitle')}
            description={t('settings.importDesc')}
            descriptionStyle={{ color: theme.colors.outline }}
            left={(props) => <List.Icon {...props} icon="file-import" color={theme.colors.gave} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.outline} />}
            onPress={() => setImportDialogVisible(true)}
          />
        </Card>
      </List.Section>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* ── About ── */}
      <Card
        style={[
          styles.aboutCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
        ]}
        elevation={0}
      >
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: '800', marginBottom: 6, color: theme.colors.onSurface }}>
            {t('settings.about')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, lineHeight: 22, fontWeight: '500' }}>
            {t('settings.aboutDesc')}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 12, fontWeight: '600' }}>
            Version 1.0.0 · 100% Offline
          </Text>
        </Card.Content>
      </Card>

      {/* ── Dialogs ── */}
      <Portal>
        {/* Language Dialog */}
        <Dialog
          visible={langDialogVisible}
          onDismiss={() => setLangDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800', fontSize: 20 }}>🌐 {t('settings.language')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(val) => changeLanguage(val as LanguageCode)}
              value={language}
            >
              {(['en', 'hi', 'te'] as LanguageCode[]).map((lang) => (
                <View key={lang} style={styles.radioRow}>
                  <RadioButton value={lang} color={theme.colors.primary} />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>{langLabels[lang]}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLangDialogVisible(false)}>{t('transactions.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Theme Dialog */}
        <Dialog
          visible={themeDialogVisible}
          onDismiss={() => setThemeDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800', fontSize: 20 }}>🎨 {t('settings.theme')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(val) => setThemeMode(val as AppThemeMode)}
              value={themeMode}
            >
              {(['system', 'light', 'dark'] as AppThemeMode[]).map((mode) => (
                <View key={mode} style={styles.radioRow}>
                  <RadioButton value={mode} color={theme.colors.primary} />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>{themeLabels[mode]}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setThemeDialogVisible(false)}>{t('common.ok')}</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Import Warning Dialog */}
        <Dialog
          visible={importDialogVisible}
          onDismiss={() => setImportDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Icon icon="alert-circle" color={theme.colors.error} />
          <Dialog.Title style={{ color: theme.colors.error, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>
            {t('settings.importTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurface }}>
              {t('settings.importConfirm')}
            </Text>
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
  listSection: {
    marginVertical: 4,
  },
  subheader: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  divider: { marginVertical: 8, marginHorizontal: 16 },
  aboutCard: {
    margin: 16,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
  },
});
