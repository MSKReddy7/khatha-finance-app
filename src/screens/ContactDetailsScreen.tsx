import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Linking, Alert } from 'react-native';
import { Text, useTheme, Card, Button, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
import { useDataStore } from '../store';
import { Contact, BooksStackParamList, Transaction } from '../types';
import { TransactionListItem } from '../components/TransactionListItem';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency } from '../utils';

type NavigationProp = NativeStackNavigationProp<BooksStackParamList>;
type ContactDetailsRouteProp = RouteProp<BooksStackParamList, 'ContactDetails'>;

export const ContactDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ContactDetailsRouteProp>();
  const isFocused = useIsFocused();

  const { contactId } = route.params;

  const refreshKey = useDataStore((state) => state.refreshKey);
  const triggerRefresh = useDataStore((state) => state.triggerRefresh);

  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const contactData = await DatabaseService.getContactById(contactId);
      if (contactData) {
        setContact(contactData);
        const txs = await DatabaseService.getTransactionsForContact(contactId);
        setTransactions(txs);
      }
    } catch (error) {
      console.error('Failed to load contact details:', error);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, refreshKey, contactId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCall = () => {
    if (contact?.phone_number) {
      Linking.openURL(`tel:${contact.phone_number}`).catch(() => {
        Alert.alert(t('common.error'), 'Could not open phone dialer');
      });
    }
  };

  const handleSMS = () => {
    if (contact?.phone_number) {
      Linking.openURL(`sms:${contact.phone_number}`).catch(() => {
        Alert.alert(t('common.error'), 'Could not open SMS messenger');
      });
    }
  };

  const handleDeleteTransaction = (txId: string) => {
    Alert.alert(t('transactions.deleteTransaction'), t('transactions.deleteConfirm'), [
      { text: t('transactions.cancel'), style: 'cancel' },
      {
        text: t('transactions.deleteTransaction'),
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteTransaction(txId);
          triggerRefresh();
        },
      },
    ]);
  };

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  const balance = contact.net_balance ?? 0;
  const totalGave = contact.total_gave ?? 0;
  const totalReceived = contact.total_received ?? 0;

  let balanceColor = theme.colors.outline;
  let balanceLabel = '';
  let balanceDisplay = formatCurrency(0);

  if (balance > 0) {
    balanceColor = theme.colors.gave;
    balanceLabel = t('common.pending');
    balanceDisplay = formatCurrency(balance);
  } else if (balance < 0) {
    balanceColor = theme.colors.received;
    balanceLabel = t('common.extraReceived');
    balanceDisplay = formatCurrency(Math.abs(balance));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Contact Header Card ── */}
      <Card
        style={[
          styles.headerCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
        ]}
        elevation={0}
      >
        <Card.Content style={styles.cardContent}>
          {/* Profile row */}
          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>
                {contact.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="titleLarge" style={[styles.contactName, { color: theme.colors.onSurface }]}>
                {contact.name}
              </Text>
              {contact.phone_number ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, fontWeight: '500' }}>
                  📞 {contact.phone_number}
                </Text>
              ) : null}
              {contact.address ? (
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2, fontWeight: '500' }}>
                  📍 {contact.address}
                </Text>
              ) : null}
            </View>
            {contact.phone_number ? (
              <View style={styles.quickActions}>
                <IconButton
                  icon="phone"
                  mode="contained"
                  containerColor={theme.colors.primaryContainer}
                  iconColor={theme.colors.primary}
                  onPress={handleCall}
                  style={styles.quickActionIcon}
                  size={20}
                />
                <IconButton
                  icon="message-text"
                  mode="contained"
                  containerColor={theme.colors.secondaryContainer}
                  iconColor={theme.colors.secondary}
                  onPress={handleSMS}
                  style={styles.quickActionIcon}
                  size={20}
                />
              </View>
            ) : null}
          </View>

          {/* 3-stat summary row */}
          <View style={[styles.statsRow, { borderTopColor: theme.colors.border }]}>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.outline }]}>
                💰 {t('books.totalGave')}
              </Text>
              <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.gave }]}>
                {formatCurrency(totalGave)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.outline }]}>
                💵 {t('books.totalReceived')}
              </Text>
              <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.received }]}>
                {formatCurrency(totalReceived)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.outline }]}>
                ⚖️ {t('books.balance')}
              </Text>
              <Text variant="titleSmall" style={[styles.statValue, { color: balanceColor }]}>
                {balanceDisplay}
              </Text>
              {balanceLabel ? (
                <View style={[styles.balanceBadge, { backgroundColor: `${balanceColor}12` }]}>
                  <Text style={{ fontSize: 9, color: balanceColor, fontWeight: '800' }}>
                    {balanceLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* ── Transaction History ── */}
      <View style={styles.historyHeader}>
        <Text variant="titleSmall" style={[styles.historyTitle, { color: theme.colors.outline }]}>
          {t('transactions.history')} ({transactions.length})
        </Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            onEdit={() =>
              navigation.navigate('AddTransaction', {
                contactId,
                transactionId: item.id,
              })
            }
            onDelete={() => handleDeleteTransaction(item.id)}
          />
        )}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState icon="receipt" message={t('transactions.emptyState')} />
        }
      />

      {/* ── Bottom: GAVE / RECEIVED Buttons ── */}
      <View style={[styles.bottomActions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <Button
          mode="contained"
          buttonColor={theme.colors.gave}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          onPress={() =>
            navigation.navigate('AddTransaction', { contactId, initialType: 'GAVE' })
          }
        >
          💰 {t('transactions.gave').split(' ')[0]}
        </Button>
        <Button
          mode="contained"
          buttonColor={theme.colors.received}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          onPress={() =>
            navigation.navigate('AddTransaction', { contactId, initialType: 'RECEIVED' })
          }
        >
          💵 {t('transactions.received').split(' ')[0]}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  cardContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileInfo: { flex: 1 },
  contactName: { fontWeight: '800', marginBottom: 2 },
  quickActions: { flexDirection: 'row', gap: 6 },
  quickActionIcon: { margin: 0, width: 36, height: 36, borderRadius: 10 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statDivider: { width: 1, height: 28, alignSelf: 'center', marginHorizontal: 2 },
  statValue: { fontWeight: '800', fontSize: 14 },
  balanceBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 },
  historyHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  historyTitle: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  listContent: { paddingBottom: 120, paddingTop: 4 },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  buttonContent: { paddingVertical: 8 },
  buttonLabel: { fontWeight: '800', fontSize: 15, color: '#FFFFFF' },
});
