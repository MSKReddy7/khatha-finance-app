import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const setDb = (db: SQLite.SQLiteDatabase): void => {
  dbInstance = db;
};

/**
 * Initializes the database asynchronously on both Web and Native platforms.
 * Uses SQLite.openDatabaseAsync to avoid requiring SharedArrayBuffer on web.
 */
export const initDatabase = async (existingDb?: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance && !existingDb) return dbInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const activeDb = existingDb || (await SQLite.openDatabaseAsync('khatha.db'));
      try {
        // Enable Foreign Key support
        await activeDb.execAsync('PRAGMA foreign_keys = ON;');

        // Create Tables
        await activeDb.execAsync(`
          CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            is_archived INTEGER DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY NOT NULL,
            book_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone_number TEXT,
            address TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY NOT NULL,
            contact_id TEXT NOT NULL,
            type TEXT CHECK(type IN ('GAVE', 'RECEIVED')) NOT NULL,
            amount REAL NOT NULL,
            note TEXT,
            transaction_date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
          );
        `);

        // Create Indexes for high performance (up to 100k transactions / 10k contacts)
        await activeDb.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_contacts_book ON contacts(book_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
        `);

        dbInstance = activeDb;
        console.log('Database initialized successfully with schema and indexes.');
        return activeDb;
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
      }
    })();
  }
  return await initPromise;
};

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    if (Platform.OS !== 'web') {
      try {
        dbInstance = SQLite.openDatabaseSync('khatha.db');
      } catch (e) {
        console.warn('openDatabaseSync fallback failed:', e);
      }
    }
  }
  if (!dbInstance) {
    throw new Error('Database is not initialized yet. Ensure initDatabase has completed.');
  }
  return dbInstance;
};
