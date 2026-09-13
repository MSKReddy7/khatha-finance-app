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
          outlineColor={theme.colors.border}
          activeOutlineColor={theme.colors.primary}
          placeholderTextColor={theme.colors.outline}
          theme={{ roundness: 12 }}
        />
        <TextInput
          label={t('reports.endDate')}
          value={reportEndDate}
          onChangeText={setReportEndDate}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={styles.dateInput}
          outlineColor={theme.colors.border}
          activeOutlineColor={theme.colors.primary}
          placeholderTextColor={theme.colors.outline}
          theme={{ roundness: 12 }}
        />
      </View>

      <View style={styles.quickRangeRow}>
        {(['today', 'yesterday', 'week', 'month', 'all'] as const).map((range) => (
          <Button
            key={range}
            mode="outlined"
            compact
            onPress={() => setQuickRange(range)}
            style={[styles.quickRangeBtn, { borderColor: theme.colors.border }]}
            labelStyle={[styles.quickRangeLabel, { color: theme.colors.onSurface }]}
          >
            {t(`reports.${range}`)}
          </Button>
        ))}
      </View>

      {/* Summary */}
      <Card
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
        ]}
        elevation={0}
      >
        <Card.Content>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {t('reports.rangeSummary')}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, fontWeight: '600' }}>
                {t('books.totalGave')}
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.gave, fontWeight: '800', marginTop: 4 }}>
                {formatCurrency(reportTotals.totalGave)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.summaryCol}>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, fontWeight: '600' }}>
                {t('books.totalReceived')}
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.received, fontWeight: '800', marginTop: 4 }}>
                {formatCurrency(reportTotals.totalReceived)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.summaryCol}>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, fontWeight: '600' }}>
                {t('books.balance')}
              </Text>
              <Text variant="titleMedium" style={{ color: balanceColor, fontWeight: '800', marginTop: 4 }}>
                {formatCurrency(Math.abs(netBal))}
              </Text>
              <View style={[styles.balanceBadge, { backgroundColor: `${balanceColor}12` }]}>
                <Text style={{ fontSize: 9, color: balanceColor, fontWeight: '800' }}>
                  {netBal >= 0 ? t('common.pending') : t('common.extraReceived')}
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Transactions */}
      <Text variant="titleMedium" style={[styles.sectionHeading, { color: theme.colors.outline, marginTop: 20 }]}>
        {t('reports.transactions')} ({reportTransactions.length})
      </Text>
      {reportTransactions.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.outline }]}>{t('reports.noTransactions')}</Text>
      ) : (
        reportTransactions.map((tx) => {
          const isGave = tx.type === 'GAVE';
          const color = isGave ? theme.colors.gave : theme.colors.received;
          return (
            <Card
              key={tx.id}
              style={[
                styles.txCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
              elevation={0}
              onPress={() => navigation.navigate('ContactDetails', { contactId: tx.contact_id, bookId })}
            >
              <Card.Content style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: theme.colors.onSurface }}>{tx.contact_name}</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 2 }}>
                    {formatDate(tx.transaction_date, 'DD MMM YYYY')}
                    {tx.note ? ` • ${tx.note}` : ''}
                  </Text>
                </View>
                <Text style={{ color, fontWeight: '800', fontSize: 15 }}>
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
  content: { padding: 16, paddingBottom: 40 },
  dateRow: { flexDirection: 'row', marginBottom: 12 },
  dateInput: { flex: 1, height: 48, backgroundColor: 'transparent' },
  quickRangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  quickRangeBtn: { borderRadius: 8, margin: 0 },
  quickRangeLabel: { fontSize: 10, fontWeight: '700' },
  summaryCard: { borderRadius: 16, marginBottom: 12, shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontWeight: '800', fontSize: 15, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 32, alignSelf: 'center', marginHorizontal: 2 },
  balanceBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 },
  sectionHeading: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11, marginBottom: 8 },
  emptyText: { fontStyle: 'italic', textAlign: 'center', marginVertical: 16, fontSize: 14 },
  txCard: { marginBottom: 8, borderRadius: 12, shadowColor: '#0F172A', shadowOpacity: 0.01, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
});
