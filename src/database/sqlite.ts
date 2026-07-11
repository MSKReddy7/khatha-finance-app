import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('khatha.db');
  }
  return dbInstance;
};

/**
 * Initializes the database schema and foreign keys.
 * This runs automatically when the SQLiteProvider starts up.
 */
export const initDatabase = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Enable Foreign Key support
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create Tables
    await db.execAsync(`
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
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_contacts_book ON contacts(book_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    `);

    console.log('Database initialized successfully with schema and indexes.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};
