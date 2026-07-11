import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { TextInput, useTheme, FAB, Portal, Dialog, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
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

  // Book dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookName, setBookName] = useState('');
  const [bookDesc, setBookDesc] = useState('');

  const loadBooks = async () => {
    try {
      const allBooks = await DatabaseService.getBooks(false);
      setBooks(allBooks);
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
      {/* Search and Sort Header */}
      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder={t('books.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={
            <TextInput.Icon
              icon={sortOrder === 'date' ? 'sort-clock-ascending' : 'sort-alphabetical-ascending'}
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
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingBook ? t('books.editBook') : t('books.addBook')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('books.bookName')}
              value={bookName}
              onChangeText={setBookName}
              mode="outlined"
              style={styles.input}
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
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setDialogVisible(false); }}>{t('transactions.cancel')}</Button>
            <Button onPress={handleCreateOrUpdate} disabled={!bookName.trim()}>
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
  searchBarContainer: { padding: 12 },
  searchInput: { height: 48 },
  listContent: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: { marginBottom: 12 },
});
