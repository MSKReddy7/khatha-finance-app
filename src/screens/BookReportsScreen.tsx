import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { TextInput, useTheme, Text, Card, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
import { useDataStore } from '../store';
import { Contact, BooksStackParamList, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { ContactCard } from '../components/ContactCard';
import { EmptyState } from '../components/EmptyState';
import dayjs from 'dayjs';

type NavigationProp = NativeStackNavigationProp<BooksStackParamList>;
type BookReportsRouteProp = RouteProp<BooksStackParamList, 'BookReports'>;

export const BookReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookReportsRouteProp>();
  const isFocused = useIsFocused();

  const { bookId } = route.params;
  const refreshKey = useDataStore((state) => state.refreshKey);

  const [refreshing, setRefreshing] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reportEndDate, setReportEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reportTransactions, setReportTransactions] = useState<Array<Transaction & { contact_name: string }>>([]);
  const [reportTotals, setReportTotals] = useState({ totalGave: 0, totalReceived: 0, netBalance: 0 });

  const loadReportData = async () => {
    try {
      let startIso: string | undefined;
      let endIso: string | undefined;

      if (reportStartDate.trim()) {
        if (dayjs(reportStartDate, 'YYYY-MM-DD', true).isValid()) {
          startIso = dayjs(reportStartDate).startOf('day').toISOString();
        } else {
          return;
        }
      }

      if (reportEndDate.trim()) {
        if (dayjs(reportEndDate, 'YYYY-MM-DD', true).isValid()) {
          endIso = dayjs(reportEndDate).endOf('day').toISOString();
        } else {
          return;
        }
      }

      const [txs, bookContacts] = await Promise.all([
        DatabaseService.getTransactionsInBook(bookId, startIso, endIso),
        DatabaseService.getContactsInBook(bookId),
      ]);

      setReportTransactions(txs);
      setContacts(bookContacts);

      let gave = 0;
      let received = 0;
      txs.forEach((tx) => {
        if (tx.type === 'GAVE') gave += tx.amount;
        else received += tx.amount;
      });
      setReportTotals({
        totalGave: gave,
        totalReceived: received,
        netBalance: gave - received,
      });
    } catch (error) {
      console.error('Failed to load book report:', error);
    }
  };

  useEffect(() => {
    if (isFocused) loadReportData();
  }, [isFocused, reportStartDate, reportEndDate, refreshKey, bookId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const setQuickRange = (range: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = dayjs().format('YYYY-MM-DD');
    if (range === 'today') {
      setReportStartDate(today);
      setReportEndDate(today);
    } else if (range === 'yesterday') {
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      setReportStartDate(yesterday);
      setReportEndDate(yesterday);
    } else if (range === 'week') {
      setReportStartDate(dayjs().subtract(7, 'days').format('YYYY-MM-DD'));
      setReportEndDate(today);
    } else if (range === 'month') {
      setReportStartDate(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
      setReportEndDate(today);
    } else {
      setReportStartDate('');
      setReportEndDate('');
    }
  };

  const netBal = reportTotals.netBalance;
  const balanceColor = netBal >= 0 ? theme.colors.gave : theme.colors.received;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
      keyboardShouldPersistTaps="handled"
    >
      {/* Date filters */}
      <View style={styles.dateRow}>
        <TextInput
          label={t('reports.startDate')}
          value={reportStartDate}
          onChangeText={setReportStartDate}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={[styles.dateInput, { marginRight: 8 }]}
        />
        <TextInput
          label={t('reports.endDate')}
          value={reportEndDate}
          onChangeText={setReportEndDate}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={styles.dateInput}
        />
      </View>

      <View style={styles.quickRangeRow}>
        {(['today', 'yesterday', 'week', 'month', 'all'] as const).map((range) => (
          <Button
            key={range}
            mode="outlined"
            compact
            onPress={() => setQuickRange(range)}
            style={styles.quickRangeBtn}
            labelStyle={styles.quickRangeLabel}
          >
            {t(`reports.${range}`)}
          </Button>
        ))}
      </View>

      {/* Summary */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            {t('reports.rangeSummary')}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text variant="bodySmall">{t('books.totalGave')}</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.gave, fontWeight: 'bold' }}>
                {formatCurrency(reportTotals.totalGave)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text variant="bodySmall">{t('books.totalReceived')}</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.received, fontWeight: 'bold' }}>
                {formatCurrency(reportTotals.totalReceived)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text variant="bodySmall">{t('books.balance')}</Text>
              <Text variant="titleMedium" style={{ color: balanceColor, fontWeight: 'bold' }}>
                {formatCurrency(Math.abs(netBal))}
              </Text>
              <Text style={{ fontSize: 9, color: balanceColor, fontWeight: '700' }}>
                {netBal >= 0 ? t('common.pending') : t('common.extraReceived')}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Contact breakdown */}
      {/* <Text variant="titleMedium" style={styles.sectionHeading}>
        {t('reports.contactBreakdown')} ({contacts.length})
      </Text>
   */}
      {/* {contacts.length === 0 ? (
        <EmptyState icon="account-outline" message={t('contacts.emptyState')} />
      ) : (
        contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onPress={() => navigation.navigate('ContactDetails', { contactId: contact.id, bookId })}
            onEdit={() => navigation.navigate('ContactDetails', { contactId: contact.id, bookId })}
            onDelete={() => {}}
            showMenu={false}
          />
        ))
      )} */}

      {/* Transactions */}
      <Text variant="titleMedium" style={[styles.sectionHeading, { marginTop: 16 }]}>
        {t('reports.transactions')} ({reportTransactions.length})
      </Text>
      {reportTransactions.length === 0 ? (
        <Text style={styles.emptyText}>{t('reports.noTransactions')}</Text>
      ) : (
        reportTransactions.map((tx) => {
          const isGave = tx.type === 'GAVE';
          const color = isGave ? theme.colors.gave : theme.colors.received;
          return (
            <Card
              key={tx.id}
              style={styles.txCard}
              onPress={() => navigation.navigate('ContactDetails', { contactId: tx.contact_id, bookId })}
            >
              <Card.Content style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{tx.contact_name}</Text>
                  <Text style={{ fontSize: 11, opacity: 0.7 }}>
                    {formatDate(tx.transaction_date, 'DD MMM YYYY')}
                    {tx.note ? ` • ${tx.note}` : ''}
                  </Text>
                </View>
                <Text style={{ color, fontWeight: '800' }}>
                  {isGave ? '-' : '+'} {formatCurrency(tx.amount)}
                </Text>
              </Card.Content>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 40 },
  dateRow: { flexDirection: 'row', marginBottom: 8 },
  dateInput: { flex: 1, height: 48, backgroundColor: 'transparent' },
  quickRangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  quickRangeBtn: { borderRadius: 8, margin: 0 },
  quickRangeLabel: { fontSize: 10 },
  summaryCard: { elevation: 0.5, borderRadius: 12, marginBottom: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.06)' },
  sectionHeading: { fontWeight: '700', marginBottom: 8, marginTop: 4 },
  emptyText: { fontStyle: 'italic', opacity: 0.6, textAlign: 'center', marginVertical: 12 },
  txCard: { marginBottom: 6, borderRadius: 10, elevation: 0.5 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
