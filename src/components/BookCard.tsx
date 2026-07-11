import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, IconButton, Menu } from 'react-native-paper';
import { Book } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReportsButton } from './ReportsButton';

interface BookCardProps {
  book: Book;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onReports: () => void;
  onRestore?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onPress,
  onEdit,
  onDelete,
  onArchive,
  onReports,
  onRestore,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const [menuVisible, setMenuVisible] = useState(false);

  const totalGave = book.total_gave ?? 0;
  const totalReceived = book.total_received ?? 0;
  const netBalance = book.net_balance ?? (totalGave - totalReceived);

  let balanceText = '₹0';
  let balanceColor = theme.colors.outline;
  let balanceSub = t('common.settled') || 'Settled';

  if (netBalance > 0) {
    balanceText = formatCurrency(netBalance);
    balanceColor = theme.colors.gave;
    balanceSub = t('common.pending');
  } else if (netBalance < 0) {
    balanceText = formatCurrency(Math.abs(netBalance));
    balanceColor = theme.colors.received;
    balanceSub = t('common.extraReceived');
  }

  const handleMenuAction = (action: () => void) => {
    setMenuVisible(false);
    setTimeout(action, 100);
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={onPress}>
      <Card.Content style={styles.content}>
        {/* Top Row: Icon + Title + Menu */}
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={22}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.titleBlock}>
            <Text variant="titleMedium" style={styles.bookName} numberOfLines={1}>
              {book.name}
            </Text>
            {book.description ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {book.description}
              </Text>
            ) : null}
          </View>


          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setMenuVisible(true)}
                style={styles.menuBtn}
              />
            }
          >
            <Menu.Item
              leadingIcon="pencil"
              onPress={() => handleMenuAction(onEdit)}
              title={t('books.editBook')}
            />
            <Menu.Item
              leadingIcon="file-document-outline"
              onPress={() => handleMenuAction(onReports)}
              title={t('reports.title')}
            />
            {book.is_archived ? (
              <Menu.Item
                leadingIcon="archive-arrow-up"
                onPress={() => handleMenuAction(onRestore || (() => { }))}
                title={t('books.restoreBook')}
              />
            ) : (
              <Menu.Item
                leadingIcon="archive-arrow-down"
                onPress={() => handleMenuAction(onArchive)}
                title={t('books.archiveBook')}
              />
            )}
            <Menu.Item
              leadingIcon="delete"
              onPress={() => handleMenuAction(onDelete)}
              title={t('books.deleteBook')}
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
          
        </View>

        {/* Stats Row: Gave | Received | Balance */}
        <View style={[styles.statsRow, { borderTopColor: theme.colors.surfaceVariant }]}>
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              💰 {t('books.totalGave')}
            </Text>
            <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.gave }]}>
              {formatCurrency(totalGave)}
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.colors.surfaceVariant }]} />

          <View style={styles.statItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              💵 {t('books.totalReceived')}
            </Text>
            <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.received }]}>
              {formatCurrency(totalReceived)}
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.colors.surfaceVariant }]} />

          <View style={styles.statItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              ⚖️ {t('books.balance')}
            </Text>
            <Text variant="titleSmall" style={[styles.statValue, { color: balanceColor }]}>
              {balanceText}
            </Text>
            <Text variant="bodySmall" style={{ color: balanceColor, fontSize: 9, fontWeight: '700' }}>
              {balanceSub}
            </Text>
          </View>
        </View>

        {/* Footer Row: contacts + reports + date */}
        <View style={styles.footerRow}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            👥 {t('books.contactsCount', { count: book.contact_count ?? 0 })}
          </Text>
          {/* <ReportsButton
            variant="pill"
            onPress={(e) => {
              e?.stopPropagation?.();
              onReports();
            }}
            style={styles.reportsPill}
          /> */}
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            🕒 {formatDate(book.updated_at, 'DD MMM YY')}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 7,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleBlock: {
    flex: 1,
  },
  bookName: {
    fontWeight: '700',
    fontSize: 16,
  },
  menuBtn: {
    margin: -8,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
});
