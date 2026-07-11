import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, Card, Button, Portal, Dialog, TextInput, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseService } from '../services/DatabaseService';
import { useDataStore } from '../store';
import { formatCurrency, formatDate } from '../utils';
import { RootStackParamList, Transaction } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  
  const refreshKey = useDataStore((state) => state.refreshKey);
  const triggerRefresh = useDataStore((state) => state.triggerRefresh);

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalContacts: 0,
    totalPending: 0,
    totalExtraReceived: 0,
    totalGiven: 0,
    totalReceived: 0,
  });
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [topDebtors, setTopDebtors] = useState<any[]>([]);

  // Dialog state for adding a book
  const [dialogVisible, setDialogVisible] = useState(false);
  const [bookName, setBookName] = useState('');
  const [bookDesc, setBookDesc] = useState('');

  const loadData = async () => {
    try {
      const dashboardStats = await DatabaseService.getDashboardStats();
      const recent = await DatabaseService.getRecentTransactions(5);
      const debtors = await DatabaseService.getTopDebtors(5);
      
      setStats(dashboardStats);
      setRecentTxs(recent);
      setTopDebtors(debtors);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, refreshKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateBook = async () => {
    if (!bookName.trim()) return;
    try {
      await DatabaseService.createBook(bookName.trim(), bookDesc.trim());
      setBookName('');
      setBookDesc('');
      setDialogVisible(false);
      triggerRefresh();
      // Navigate to Books list
      navigation.navigate('BooksList');
    } catch (error) {
      console.error('Failed to create book:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Net Cashflow Banner */}
        <Card style={[styles.netCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <View style={styles.netHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                {t('dashboard.netSummary')}
              </Text>
              <MaterialCommunityIcons name="wallet-outline" size={24} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text variant="headlineLarge" style={[styles.netAmount, { color: theme.colors.primary }]}>
              {formatCurrency(stats.totalGiven - stats.totalReceived)}
            </Text>
            <View style={styles.statsSplitRow}>
              <View style={styles.splitCol}>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {t('dashboard.gave')}
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.gave, fontWeight: 'bold' }}>
                  {formatCurrency(stats.totalGiven)}
                </Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.splitCol}>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {t('dashboard.received')}
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.received, fontWeight: 'bold' }}>
                  {formatCurrency(stats.totalReceived)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Aggregate Stats Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statsCard}>
            <Card.Content style={styles.statsCardContent}>
              <View style={styles.statsIconBox}>
                <MaterialCommunityIcons name="book-multiple" size={24} color={theme.colors.primary} />
              </View>
              <View>
                <Text variant="titleLarge" style={styles.statsValue}>
                  {stats.totalBooks}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('dashboard.totalBooks')}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content style={styles.statsCardContent}>
              <View style={styles.statsIconBox}>
                <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.primary} />
              </View>
              <View>
                <Text variant="titleLarge" style={styles.statsValue}>
                  {stats.totalContacts}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('dashboard.totalContacts')}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Top Debtors Section */}
        {topDebtors.length > 0 ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('reports.topDebtors')}
            </Text>
            {topDebtors.map((debtor) => (
              <Card
                key={debtor.contactId}
                style={styles.listItemCard}
                onPress={() =>
                  navigation.navigate('ContactDetails', {
                    contactId: debtor.contactId,
                    bookId: '', // loaded inside details
                  })
                }
              >
                <Card.Content style={styles.listItemContent}>
                  <View style={styles.listItemLeft}>
                    <Text variant="titleSmall" style={styles.debtorName}>
                      {debtor.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {debtor.bookName}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ color: theme.colors.gave, fontWeight: 'bold' }}>
                    {formatCurrency(debtor.balance)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : null}

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('dashboard.recentTransactions')}
          </Text>
          {recentTxs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyCardContent}>
                <MaterialCommunityIcons name="receipt" size={32} color={theme.colors.outline} />
                <Text style={{ marginTop: 8 }}>{t('dashboard.noRecentTransactions')}</Text>
              </Card.Content>
            </Card>
          ) : (
            recentTxs.map((tx) => {
              const isGave = tx.type === 'GAVE';
              const color = isGave ? theme.colors.gave : theme.colors.received;
              return (
                <Card
                  key={tx.id}
                  style={styles.listItemCard}
                  onPress={() =>
                    navigation.navigate('ContactDetails', {
                      contactId: tx.contact_id,
                      bookId: '',
                    })
                  }
                >
                  <Card.Content style={styles.listItemContent}>
                    <View style={styles.listItemLeft}>
                      <Text variant="titleSmall" style={styles.debtorName}>
                        {tx.contact_name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatDate(tx.transaction_date, 'DD MMM YYYY')}
                      </Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text variant="titleMedium" style={{ color, fontWeight: 'bold' }}>
                        {isGave ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label={t('books.addBook')}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => setDialogVisible(true)}
      />

      {/* Create Book Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('books.addBook')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('books.bookName')}
              value={bookName}
              onChangeText={setBookName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('books.description')}
              value={bookDesc}
              onChangeText={setBookDesc}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('transactions.cancel')}</Button>
            <Button onPress={handleCreateBook} disabled={!bookName.trim()}>
              {t('transactions.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  netCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 2,
  },
  netHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statsSplitRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 12,
    marginTop: 8,
  },
  splitCol: {
    flex: 1,
    alignItems: 'center',
  },
  dividerVertical: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    elevation: 1,
  },
  statsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(63, 81, 181, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsValue: {
    fontWeight: 'bold',
    fontSize: 20,
    lineHeight: 22,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    opacity: 0.8,
  },
  listItemCard: {
    marginBottom: 8,
    borderRadius: 10,
    elevation: 0.5,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  debtorName: {
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 10,
    elevation: 0.5,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 12,
  },
});
