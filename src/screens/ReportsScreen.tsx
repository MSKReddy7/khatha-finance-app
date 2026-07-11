import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
import { useDataStore } from '../store';
import { formatCurrency, formatDate } from '../utils';
import { RootStackParamList, Transaction } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  
  const refreshKey = useDataStore((state) => state.refreshKey);

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalExtraReceived: 0,
    totalGiven: 0,
    totalReceived: 0,
  });
  const [topDebtors, setTopDebtors] = useState<any[]>([]);
  const [activities, setActivities] = useState<Transaction[]>([]);

  const loadReportData = async () => {
    try {
      const dashboardStats = await DatabaseService.getDashboardStats();
      const debtors = await DatabaseService.getTopDebtors(10); // get top 10 debtors
      const recent = await DatabaseService.getRecentTransactions(10); // get recent 10 transactions

      setStats(dashboardStats);
      setTopDebtors(debtors);
      setActivities(recent);
    } catch (error) {
      console.error('Failed to load report data:', error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadReportData();
    }
  }, [isFocused, refreshKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* Financial Aggregates Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {t('reports.activity')}
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statsItem}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {t('reports.totalGave')}
                </Text>
                <Text variant="titleLarge" style={[styles.statsValue, { color: theme.colors.gave }]}>
                  {formatCurrency(stats.totalGiven)}
                </Text>
              </View>
              <View style={styles.statsItem}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {t('reports.totalReceived')}
                </Text>
                <Text variant="titleLarge" style={[styles.statsValue, { color: theme.colors.received }]}>
                  {formatCurrency(stats.totalReceived)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.pendingRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.subtext }}>
                {t('reports.pendingAmount')}
              </Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.gave, fontWeight: 'bold' }}>
                {formatCurrency(stats.totalGiven - stats.totalReceived)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Top Debtors List */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('reports.topDebtors')}
        </Text>
        {topDebtors.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyCardContent}>
              <Text style={{ color: theme.colors.outline }}>{t('reports.noDebtors')}</Text>
            </Card.Content>
          </Card>
        ) : (
          topDebtors.map((debtor) => (
            <Card
              key={debtor.contactId}
              style={styles.debtorCard}
              onPress={() =>
                navigation.navigate('ContactDetails', {
                  contactId: debtor.contactId,
                  bookId: '',
                })
              }
            >
              <Card.Content style={styles.debtorCardContent}>
                <View>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                    {debtor.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {debtor.bookName} • {debtor.phone || 'No phone'}
                  </Text>
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.gave, fontWeight: 'bold' }}>
                  {formatCurrency(debtor.balance)}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </View>

      {/* Recent Activities list */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('dashboard.recentTransactions')}
        </Text>
        {activities.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyCardContent}>
              <Text style={{ color: theme.colors.outline }}>{t('dashboard.noRecentTransactions')}</Text>
            </Card.Content>
          </Card>
        ) : (
          activities.map((tx) => {
            const isGave = tx.type === 'GAVE';
            const color = isGave ? theme.colors.gave : theme.colors.received;
            return (
              <View key={tx.id} style={styles.activityRow}>
                <View style={[styles.activityDot, { backgroundColor: color }]}>
                  <MaterialCommunityIcons
                    name={isGave ? 'arrow-down' : 'arrow-up'}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityTextRow}>
                    <Text variant="bodyMedium" style={styles.activityContactName}>
                      {tx.contact_name}
                    </Text>
                    <Text variant="bodyMedium" style={{ color, fontWeight: 'bold' }}>
                      {isGave ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </Text>
                  </View>
                  <View style={styles.activitySubRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {tx.note || 'No note'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDate(tx.transaction_date, 'DD MMM YYYY')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  card: {
    margin: 16,
    borderRadius: 14,
    elevation: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsItem: {
    flex: 1,
  },
  statsValue: {
    fontWeight: '800',
    fontSize: 22,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    opacity: 0.8,
  },
  debtorCard: {
    marginBottom: 8,
    borderRadius: 10,
    elevation: 0.5,
  },
  debtorCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingBottom: 8,
  },
  activityTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityContactName: {
    fontWeight: '600',
  },
  activitySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  emptyCard: {
    elevation: 0.5,
    borderRadius: 8,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
