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
        <View style={[styles.timelineLine, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={[styles.timelineNode, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={14} color="#FFFFFF" />
        </View>
      </View>

      {/* Card content */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={styles.leftBlock}>
            {/* Type badge */}
            <View style={[styles.typeBadge, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.typeLabel, { color }]}>{typeLabel}</Text>
            </View>
            <Text style={[styles.amount, { color }]}>
              {amountPrefix}{formatCurrency(transaction.amount)}
            </Text>
            <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
              {formatTimelineDate(transaction.transaction_date)}
            </Text>
            {transaction.note ? (
              <Text style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                {transaction.note}
              </Text>
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
    minHeight: 72,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    marginVertical: 5,
    marginLeft: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
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
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  menuBtn: {
    margin: -8,
  },
});
