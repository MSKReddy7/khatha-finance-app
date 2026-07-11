export interface Book {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  // Computed fields (not stored in DB, populated during query or calculations)
  contact_count?: number;
  total_gave?: number;
  total_received?: number;
  net_balance?: number; // total_gave - total_received
}

export interface Contact {
  id: string;
  book_id: string;
  name: string;
  phone_number: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  net_balance?: number;
  total_gave?: number;
  total_received?: number;
}

export type TransactionType = 'GAVE' | 'RECEIVED';

export interface Transaction {
  id: string;
  contact_id: string;
  type: TransactionType;
  amount: number;
  note: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  // Join fields if needed
  contact_name?: string;
}

export type LanguageCode = 'en' | 'te' | 'hi';
export type AppThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  language: LanguageCode;
  themeMode: AppThemeMode;
}

// Books Tab Stack Navigation
export type BooksStackParamList = {
  BooksList: undefined;
  BookDetails: { bookId: string; bookName: string };
  BookReports: { bookId: string; bookName: string };
  ContactDetails: { contactId: string; bookId: string };
  AddTransaction: { contactId: string; transactionId?: string; initialType?: TransactionType };
};

export type TabParamList = {
  BooksTab: undefined;
  Settings: undefined;
};

// Keep for backward compat (used in navigation.navigate from ContactDetails)
export type RootStackParamList = BooksStackParamList;
