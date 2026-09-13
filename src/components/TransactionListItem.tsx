import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, IconButton, Menu } from 'react-native-paper';
import { Transaction } from '../types';
import { formatCurrency, formatTimelineDate } from '../utils';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TransactionListItemProps {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const [menuVisible, setMenuVisible] = useState(false);

  const isGave = transaction.type === 'GAVE';
  const color = isGave ? theme.colors.gave : theme.colors.received;
  const icon: any = isGave ? 'arrow-top-right' : 'arrow-bottom-left';
  const typeLabel = isGave ? t('transactions.gaveAction') : t('transactions.receivedAction');
  const amountPrefix = isGave ? '- ' : '+ ';

  const handleMenuAction = (action: () => void) => {
    setMenuVisible(false);
    setTimeout(action, 100);
  };

  return (
    <View style={styles.container}>
      {/* Timeline column */}
      <View style={styles.timelineColumn}>
        <View style={[styles.timelineLine, { backgroundColor: theme.colors.border }]} />
        <View style={[styles.timelineNode, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={13} color="#FFFFFF" />
        </View>
      </View>

      {/* Card content */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.leftBlock}>
            {/* Type badge */}
            <View style={[styles.typeBadge, { backgroundColor: `${color}12` }]}>
              <Text style={[styles.typeLabel, { color, fontWeight: '800' }]}>{typeLabel}</Text>
            </View>
            <Text style={[styles.amount, { color }]}>
              {amountPrefix}{formatCurrency(transaction.amount)}
            </Text>
            <Text style={[styles.dateText, { color: theme.colors.outline }]}>
              {formatTimelineDate(transaction.transaction_date)}
            </Text>
            {transaction.note ? (
              <View style={[styles.noteContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.noteText, { color: theme.colors.subtext }]} numberOfLines={2}>
                  {transaction.note}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action menu */}
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={18}
                style={styles.menuBtn}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              leadingIcon="pencil"
              onPress={() => handleMenuAction(onEdit)}
              title={t('transactions.editTransaction')}
            />
            <Menu.Item
              leadingIcon="delete"
              onPress={() => handleMenuAction(onDelete)}
              title={t('transactions.deleteTransaction')}
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    minHeight: 76,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 36,
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    left: 17,
    zIndex: 0,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    marginLeft: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftBlock: {
    flex: 1,
    paddingRight: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  noteContainer: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
  },
  menuBtn: {
    margin: -8,
  },
});
