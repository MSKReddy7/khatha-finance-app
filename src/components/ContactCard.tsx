import React, { useState } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import { Card, Text, useTheme, IconButton, Menu } from 'react-native-paper';
import { Contact } from '../types';
import { formatCurrency } from '../utils';
import { useTranslation } from 'react-i18next';

interface ContactCardProps {
  contact: Contact;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showMenu?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onPress,
  onEdit,
  onDelete,
  showMenu = true,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const [menuVisible, setMenuVisible] = useState(false);

  const totalGave = contact.total_gave ?? 0;
  const totalReceived = contact.total_received ?? 0;
  const balance = contact.net_balance ?? (totalGave - totalReceived);

  let balanceColor = theme.colors.outline;
  let balanceSub = '';
  let balanceText = '₹0';

  if (balance > 0) {
    balanceText = formatCurrency(balance);
    balanceColor = theme.colors.gave;
    balanceSub = t('common.pending');
  } else if (balance < 0) {
    balanceText = formatCurrency(Math.abs(balance));
    balanceColor = theme.colors.received;
    balanceSub = t('common.extraReceived');
  }

  const handleCall = () => {
    if (contact.phone_number) {
      Linking.openURL(`tel:${contact.phone_number}`).catch(() => {
        Alert.alert(t('common.error'), 'Could not open phone dialer');
      });
    }
  };

  const handleMenuAction = (action: () => void) => {
    setMenuVisible(false);
    setTimeout(action, 100);
  };

  // Avatar initials
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '?';

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
        },
      ]}
      onPress={onPress}
      elevation={0}
    >
      <Card.Content style={styles.content}>
        {/* Top: Avatar + Name + Phone + Menu */}
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="titleMedium" style={[styles.avatarText, { color: theme.colors.primary }]}>
              {initials}
            </Text>
          </View>

          <View style={styles.nameBlock}>
            <Text variant="titleMedium" style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {contact.name}
            </Text>
            {contact.phone_number ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.outline, marginTop: 1 }}
                numberOfLines={1}
              >
                📞 {contact.phone_number}
              </Text>
            ) : null}
          </View>

          {contact.phone_number ? (
            <IconButton
              icon="phone"
              size={18}
              iconColor={theme.colors.primary}
              onPress={handleCall}
              style={styles.actionIcon}
            />
          ) : null}

          {showMenu ? (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={18}
                  onPress={() => setMenuVisible(true)}
                  style={styles.actionIcon}
                />
              }
            >
              <Menu.Item
                leadingIcon="pencil"
                onPress={() => handleMenuAction(onEdit)}
                title={t('contacts.editContact')}
              />
              <Menu.Item
                leadingIcon="delete"
                onPress={() => handleMenuAction(onDelete)}
                title={t('contacts.deleteContact')}
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
          ) : null}
        </View>

        {/* Balance row: Given | Received | Balance */}
        <View style={[styles.statsRow, { borderTopColor: theme.colors.border }]}>
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.outline }]}>
              {t('books.totalGave')}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.gave }]}>
              {formatCurrency(totalGave)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.statItem}>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.outline }]}>
              {t('books.totalReceived')}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.received }]}>
              {formatCurrency(totalReceived)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.statItem}>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.outline }]}>
              {t('books.balance')}
            </Text>
            <Text style={[styles.statValue, { color: balanceColor }]}>{balanceText}</Text>
            {balanceSub ? (
              <View style={[styles.balanceBadge, { backgroundColor: `${balanceColor}12` }]}>
                <Text style={{ fontSize: 9, color: balanceColor, fontWeight: '800' }}>
                  {balanceSub}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontWeight: '800' },
  nameBlock: { flex: 1 },
  name: { fontWeight: '800' },
  actionIcon: { margin: -6 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  divider: {
    width: 1,
    height: 28,
    alignSelf: 'center',
    marginHorizontal: 2,
  },
  statValue: {
    fontWeight: '800',
    fontSize: 13,
  },
  balanceBadge: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
});
