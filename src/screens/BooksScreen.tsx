import React, { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, TextInput, useTheme, FAB, Portal, Dialog, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
import { formatCurrency } from '../utils';
import { useDataStore } from '../store';
import { Book, BooksStackParamList } from '../types';
import { BookCard } from '../components/BookCard';
import { EmptyState } from '../components/EmptyState';

type NavigationProp = NativeStackNavigationProp<BooksStackParamList>;

export const BooksScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();

  const refreshKey = useDataStore((state) => state.refreshKey);
  const triggerRefresh = useDataStore((state) => state.triggerRefresh);

  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date');
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalGiven: 0,
    totalReceived: 0,
  });

  // Book dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookName, setBookName] = useState('');
  const [bookDesc, setBookDesc] = useState('');

  const loadBooks = async () => {
    try {
      const [allBooks, dashboardStats] = await Promise.all([
        DatabaseService.getBooks(false),
        DatabaseService.getDashboardStats(),
      ]);
      setBooks(allBooks);
      setStats({
        totalBooks: dashboardStats.totalBooks,
        totalGiven: dashboardStats.totalGiven,
        totalReceived: dashboardStats.totalReceived,
      });
      applyFilterAndSort(allBooks, searchQuery, sortOrder);
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadBooks();
    }
  }, [isFocused, refreshKey]);

  useEffect(() => {
    applyFilterAndSort(books, searchQuery, sortOrder);
  }, [searchQuery, sortOrder, books]);

  const applyFilterAndSort = (items: Book[], query: string, sort: 'date' | 'name') => {
    let filtered = [...items];
    if (query.trim()) {
      filtered = filtered.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    setFilteredBooks(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const handleCreateOrUpdate = async () => {
    if (!bookName.trim()) return;
    try {
      if (editingBook) {
        await DatabaseService.updateBook(editingBook.id, bookName.trim(), bookDesc.trim());
      } else {
        await DatabaseService.createBook(bookName.trim(), bookDesc.trim());
      }
      setBookName('');
      setBookDesc('');
      setEditingBook(null);
      setDialogVisible(false);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to save book:', error);
    }
  };

  const startEdit = (book: Book) => {
    setEditingBook(book);
    setBookName(book.name);
    setBookDesc(book.description);
    setDialogVisible(true);
  };

  const handleDelete = (book: Book) => {
    Alert.alert(
      t('books.deleteBook'),
      t('books.deleteConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('books.deleteBook'),
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.deleteBook(book.id);
            triggerRefresh();
          },
        },
      ]
    );
  };

  const handleArchive = (book: Book) => {
    Alert.alert(
      t('books.archiveBook'),
      t('books.archiveConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('books.archiveBook'),
          onPress: async () => {
            await DatabaseService.archiveBook(book.id);
            triggerRefresh();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Summary Card: Given | Balance | Received */}
      <View style={[styles.totalBooksContainer, { backgroundColor: theme.colors.primaryContainer }]}>
        {/* Header row */}
        <View style={styles.summaryHeader}>
          <View style={styles.summaryHeaderLeft}>
            <MaterialCommunityIcons
              name="book-multiple"
              size={18}
              color={theme.colors.onPrimaryContainer}
              style={{ marginRight: 6 }}
            />
            <Text variant="bodyMedium" style={[styles.summaryHeaderLabel, { color: theme.colors.onPrimaryContainer }]}>
              {stats.totalBooks} {t('dashboard.totalBooks')}
            </Text>
          </View>
          <MaterialCommunityIcons name="wallet-outline" size={20} color={theme.colors.onPrimaryContainer} />
        </View>

        {/* Net balance
        <Text variant="headlineMedium" style={[styles.totalBooksAmount, { color: theme.colors.primary }]}>
          {formatCurrency(stats.totalGiven - stats.totalReceived)}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.6, marginBottom: 12 }}>
          {t('dashboard.netSummary')}
        </Text> */}

        {/* Divider */}
        <View style={[styles.summaryDividerHorizontal, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />

        {/* 3-col split: Given | Balance | Received */}
        <View style={styles.totalBooksSplitRow}>
          <View style={styles.totalBooksSplitCol}>
            <MaterialCommunityIcons name="arrow-up-circle-outline" size={16} color={theme.colors.gave} />
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 2 }}>
              {t('dashboard.gave')}
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.gave, fontWeight: '700', marginTop: 2 }}>
              {formatCurrency(stats.totalGiven)}
            </Text>
          </View>

          <View style={styles.totalBooksDividerVertical} />

          <View style={styles.totalBooksSplitCol}>
            <MaterialCommunityIcons name="scale-balance" size={16} color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 2 }}>
              Balance
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 2 }}>
              {formatCurrency(Math.abs(stats.totalGiven - stats.totalReceived))}
            </Text>
          </View>

          <View style={styles.totalBooksDividerVertical} />

          <View style={styles.totalBooksSplitCol}>
            <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color={theme.colors.received} />
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 2 }}>
              {t('dashboard.received')}
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.received, fontWeight: '700', marginTop: 2 }}>
              {formatCurrency(stats.totalReceived)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Search and Sort Header */}
      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder={t('books.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          outlineColor={theme.colors.border}
          activeOutlineColor={theme.colors.primary}
          placeholderTextColor={theme.colors.outline}
          theme={{ roundness: 12 }}
          left={<TextInput.Icon icon="magnify" color={theme.colors.outline} />}
          right={
            <TextInput.Icon
              icon={sortOrder === 'date' ? 'sort-clock-ascending' : 'sort-alphabetical-ascending'}
              color={theme.colors.primary}
              onPress={() => setSortOrder((prev) => (prev === 'date' ? 'name' : 'date'))}
            />
          }
        />
      </View>

      {/* Books List */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() =>
              navigation.navigate('BookDetails', { bookId: item.id, bookName: item.name })
            }
            onReports={() =>
              navigation.navigate('BookReports', { bookId: item.id, bookName: item.name })
            }
            onEdit={() => startEdit(item)}
            onDelete={() => handleDelete(item)}
            onArchive={() => handleArchive(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="book-multiple-outline"
            message={t('books.emptyState')}
            actionButton={
              <Button
                mode="contained"
                onPress={() => {
                  setEditingBook(null);
                  setBookName('');
                  setBookDesc('');
                  setDialogVisible(true);
                }}
                style={{ borderRadius: 10 }}
              >
                {t('books.addBook')}
              </Button>
            }
          />
        }
      />

      {/* FAB */}
      <FAB
        icon="plus"
        label={t('books.addBook')}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => {
          setEditingBook(null);
          setBookName('');
          setBookDesc('');
          setDialogVisible(true);
        }}
      />

      {/* Dialog for Add/Edit */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '800', fontSize: 20 }}>
            {editingBook ? t('books.editBook') : t('books.addBook')}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('books.bookName')}
              value={bookName}
              onChangeText={setBookName}
              mode="outlined"
              style={styles.input}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
              theme={{ roundness: 10 }}
              autoFocus
            />
            <TextInput
              label={t('books.description')}
              value={bookDesc}
              onChangeText={setBookDesc}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
              theme={{ roundness: 10 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setDialogVisible(false); }}>{t('transactions.cancel')}</Button>
            <Button
              onPress={handleCreateOrUpdate}
              disabled={!bookName.trim()}
              mode="contained"
              style={{ borderRadius: 8 }}
            >
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
  searchBarContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  searchInput: { height: 48, backgroundColor: 'transparent' },
  listContent: { paddingBottom: 110, paddingTop: 6 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    elevation: 4,
  },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  totalBooksContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 20,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryHeaderLabel: {
    fontWeight: '600',
  },
  summaryDividerHorizontal: {
    height: 1,
    marginBottom: 12,
  },
  totalBooksSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  totalBooksSplitCol: {
    flex: 1,
    alignItems: 'center',
  },
  totalBooksDividerVertical: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignSelf: 'center',
  },
  totalBooksAmount: {
    fontWeight: '800',
    marginBottom: 2,
  },
});
