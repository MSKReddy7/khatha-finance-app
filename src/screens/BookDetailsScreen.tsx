import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { TextInput, useTheme, Text, FAB, Portal, Dialog, Button, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
import { useDataStore } from '../store';
import { Contact, BooksStackParamList } from '../types';
import { ContactCard } from '../components/ContactCard';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency } from '../utils';
import { ReportsButton } from '../components/ReportsButton';

type NavigationProp = NativeStackNavigationProp<BooksStackParamList>;
type BookDetailsRouteProp = RouteProp<BooksStackParamList, 'BookDetails'>;

export const BookDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookDetailsRouteProp>();
  const isFocused = useIsFocused();

  const { bookId, bookName } = route.params;

  const refreshKey = useDataStore((state) => state.refreshKey);
  const triggerRefresh = useDataStore((state) => state.triggerRefresh);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'name' | 'balance'>('name');

  const [totals, setTotals] = useState({
    totalGave: 0,
    totalReceived: 0,
    netBalance: 0,
  });

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  const loadContacts = async () => {
    try {
      const data = await DatabaseService.getContactsInBook(bookId);
      setContacts(data);

      let gave = 0;
      let received = 0;
      data.forEach((c) => {
        gave += c.total_gave ?? 0;
        received += c.total_received ?? 0;
      });
      setTotals({ totalGave: gave, totalReceived: received, netBalance: gave - received });
      applyFilterAndSort(data, searchQuery, sortOrder);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  useEffect(() => {
    if (isFocused) loadContacts();
  }, [isFocused, refreshKey, bookId]);

  useEffect(() => {
    applyFilterAndSort(contacts, searchQuery, sortOrder);
  }, [searchQuery, sortOrder, contacts]);

  const applyFilterAndSort = (items: Contact[], query: string, sort: 'name' | 'balance') => {
    let filtered = [...items];
    if (query.trim()) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.phone_number && c.phone_number.includes(query))
      );
    }
    filtered.sort((a, b) => {
      if (sort === 'balance')
        return Math.abs(b.net_balance ?? 0) - Math.abs(a.net_balance ?? 0);
      return a.name.localeCompare(b.name);
    });
    setFilteredContacts(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleSaveContact = async () => {
    if (!contactName.trim()) return;
    try {
      if (editingContact) {
        await DatabaseService.updateContact(
          editingContact.id,
          contactName.trim(),
          contactPhone.trim(),
          contactAddress.trim(),
          contactNotes.trim()
        );
      } else {
        await DatabaseService.createContact(
          bookId,
          contactName.trim(),
          contactPhone.trim(),
          contactAddress.trim(),
          contactNotes.trim()
        );
      }
      resetForm();
      setDialogVisible(false);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactPhone(contact.phone_number);
    setContactAddress(contact.address);
    setContactNotes(contact.notes);
    setDialogVisible(true);
  };

  const handleDelete = (contact: Contact) => {
    Alert.alert(t('contacts.deleteContact'), t('contacts.deleteConfirm'), [
      { text: t('transactions.cancel'), style: 'cancel' },
      {
        text: t('contacts.deleteContact'),
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteContact(contact.id);
          triggerRefresh();
        },
      },
    ]);
  };

  const resetForm = () => {
    setEditingContact(null);
    setContactName('');
    setContactPhone('');
    setContactAddress('');
    setContactNotes('');
  };

  const openReports = () => {
    navigation.navigate('BookReports', { bookId, bookName });
  };

  const netBal = totals.netBalance;
  let balanceColor = theme.colors.outline;
  let balanceBadge = '';
  if (netBal > 0) { balanceColor = theme.colors.gave; balanceBadge = t('common.pending'); }
  else if (netBal < 0) { balanceColor = theme.colors.received; balanceBadge = t('common.extraReceived'); }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: `${theme.colors.gave}14` }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            💰 {t('books.totalGave')}
          </Text>
          <Text variant="titleMedium" style={[styles.summaryValue, { color: theme.colors.gave }]}>
            {formatCurrency(totals.totalGave)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: `${theme.colors.received}14` }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            💵 {t('books.totalReceived')}
          </Text>
          <Text variant="titleMedium" style={[styles.summaryValue, { color: theme.colors.received }]}>
            {formatCurrency(totals.totalReceived)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: `${balanceColor}14` }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            ⚖️ {t('books.balance')}
          </Text>
          <Text variant="titleMedium" style={[styles.summaryValue, { color: balanceColor }]}>
            {formatCurrency(Math.abs(netBal))}
          </Text>
          {balanceBadge ? (
            <Text style={{ fontSize: 9, color: balanceColor, fontWeight: '700' }}>
              {balanceBadge}
            </Text>
          ) : null}
        </View>
      </View>

      <ReportsButton onPress={openReports} variant="banner" />

      <View style={styles.searchRow}>
        <TextInput
          placeholder={t('contacts.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={
            <TextInput.Icon
              icon={sortOrder === 'name' ? 'sort-alphabetical-ascending' : 'sort-numeric-descending'}
              onPress={() => setSortOrder((p) => (p === 'name' ? 'balance' : 'name'))}
            />
          }
        />
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContactCard
            contact={item}
            onPress={() => navigation.navigate('ContactDetails', { contactId: item.id, bookId })}
            onEdit={() => startEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="account-outline"
            message={t('contacts.emptyState')}
            actionButton={
              <Button
                mode="contained"
                onPress={() => { resetForm(); setDialogVisible(true); }}
              >
                {t('contacts.addContact')}
              </Button>
            }
          />
        }
      />

      <FAB
        icon="account-plus"
        label={t('contacts.addContact')}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => { resetForm(); setDialogVisible(true); }}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => { setDialogVisible(false); resetForm(); }}>
          <Dialog.Title>
            {editingContact ? t('contacts.editContact') : t('contacts.addContact')}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('contacts.name')}
              value={contactName}
              onChangeText={setContactName}
              mode="outlined"
              style={styles.input}
              autoFocus
            />
            <TextInput
              label={t('contacts.phone')}
              value={contactPhone}
              onChangeText={setContactPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label={t('contacts.address')}
              value={contactAddress}
              onChangeText={setContactAddress}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('contacts.notes')}
              value={contactNotes}
              onChangeText={setContactNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setDialogVisible(false); resetForm(); }}>
              {t('transactions.cancel')}
            </Button>
            <Button onPress={handleSaveContact} disabled={!contactName.trim()}>
              {t('transactions.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontWeight: '800',
    marginTop: 4,
    fontSize: 15,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  searchInput: { flex: 1, height: 48 },
  listContent: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: { marginBottom: 8 },
});
