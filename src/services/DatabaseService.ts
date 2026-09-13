import { Platform } from 'react-native';
import { getDb } from '../database/sqlite';
import { Book, Contact, Transaction, TransactionType } from '../types';

const isWeb = Platform.OS === 'web';

// Simple helper to generate unique IDs since we don't have uuid npm package installed
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const DatabaseService = {
  // ==========================================
  // BOOK CRUD
  // ==========================================
  
  async createBook(name: string, description: string): Promise<Book> {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    
    await db.runAsync(
      'INSERT INTO books (id, name, description, created_at, updated_at, is_archived) VALUES (?, ?, ?, ?, ?, 0)',
      [id, name, description, now, now]
    );

    return {
      id,
      name,
      description,
      created_at: now,
      updated_at: now,
      is_archived: false,
      contact_count: 0,
      net_balance: 0,
    };
  },

  async updateBook(id: string, name: string, description: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE books SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [name, description, now, id]
    );
  },

  async deleteBook(id: string): Promise<void> {
    const db = getDb();
    // ON DELETE CASCADE will handle contacts and transactions
    await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
  },

  async archiveBook(id: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE books SET is_archived = 1, updated_at = ? WHERE id = ?',
      [now, id]
    );
  },

  async restoreBook(id: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE books SET is_archived = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  },

  async getBooks(includeArchived = false): Promise<Book[]> {
    const db = getDb();
    
    // Select all books with contact count, total gave, total received, and net balance
    const sql = `
      SELECT b.*,
        (SELECT COUNT(*) FROM contacts c WHERE c.book_id = b.id) as contact_count,
        COALESCE(
          (SELECT SUM(t.amount)
           FROM transactions t
           JOIN contacts c ON t.contact_id = c.id
           WHERE c.book_id = b.id AND t.type = 'GAVE'),
          0
        ) as total_gave,
        COALESCE(
          (SELECT SUM(t.amount)
           FROM transactions t
           JOIN contacts c ON t.contact_id = c.id
           WHERE c.book_id = b.id AND t.type = 'RECEIVED'),
          0
        ) as total_received
      FROM books b
      WHERE b.is_archived = ?
      ORDER BY b.updated_at DESC
    `;

    const rows = await db.getAllAsync<any>(sql, [includeArchived ? 1 : 0]);
    
    return rows.map((row) => ({
      ...row,
      is_archived: row.is_archived === 1,
      net_balance: (row.total_gave ?? 0) - (row.total_received ?? 0),
    }));
  },

  // ==========================================
  // CONTACT CRUD
  // ==========================================

  async createContact(
    bookId: string,
    name: string,
    phoneNumber: string,
    address: string,
    notes: string
  ): Promise<Contact> {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO contacts (id, book_id, name, phone_number, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, bookId, name, phoneNumber, address, notes, now, now]
    );

    // Update book updated_at
    await db.runAsync('UPDATE books SET updated_at = ? WHERE id = ?', [now, bookId]);

    return {
      id,
      book_id: bookId,
      name,
      phone_number: phoneNumber,
      address,
      notes,
      created_at: now,
      updated_at: now,
      net_balance: 0,
      total_gave: 0,
      total_received: 0,
    };
  },

  async updateContact(
    id: string,
    name: string,
    phoneNumber: string,
    address: string,
    notes: string
  ): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    await db.runAsync(
      'UPDATE contacts SET name = ?, phone_number = ?, address = ?, notes = ?, updated_at = ? WHERE id = ?',
      [name, phoneNumber, address, notes, now, id]
    );

    // Update parent book's updated_at
    const contact = await this.getContactById(id);
    if (contact) {
      await db.runAsync('UPDATE books SET updated_at = ? WHERE id = ?', [now, contact.book_id]);
    }
  },

  async deleteContact(id: string): Promise<void> {
    const db = getDb();
    const contact = await this.getContactById(id);
    await db.runAsync('DELETE FROM contacts WHERE id = ?', [id]);

    if (contact) {
      const now = new Date().toISOString();
      await db.runAsync('UPDATE books SET updated_at = ? WHERE id = ?', [now, contact.book_id]);
    }
  },

  async getContactsInBook(bookId: string): Promise<Contact[]> {
    const db = getDb();

    const sql = `
      SELECT c.*,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'GAVE'), 0) as total_gave,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'RECEIVED'), 0) as total_received
      FROM contacts c
      WHERE c.book_id = ?
      ORDER BY c.name ASC
    `;

    const rows = await db.getAllAsync<any>(sql, [bookId]);

    return rows.map((row) => ({
      ...row,
      net_balance: row.total_gave - row.total_received,
    }));
  },

  async getContactById(id: string): Promise<Contact | null> {
    const db = getDb();

    const sql = `
      SELECT c.*,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'GAVE'), 0) as total_gave,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'RECEIVED'), 0) as total_received
      FROM contacts c
      WHERE c.id = ?
    `;

    const row = await db.getFirstAsync<any>(sql, [id]);
    if (!row) return null;

    return {
      ...row,
      net_balance: row.total_gave - row.total_received,
    };
  },

  // ==========================================
  // TRANSACTION CRUD
  // ==========================================

  async createTransaction(
    contactId: string,
    type: TransactionType,
    amount: number,
    note: string,
    transactionDate: string
  ): Promise<Transaction> {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO transactions (id, contact_id, type, amount, note, transaction_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, contactId, type, amount, note, transactionDate, now, now]
    );

    // Update timestamps on contact and book
    await db.runAsync('UPDATE contacts SET updated_at = ? WHERE id = ?', [now, contactId]);
    const contact = await this.getContactById(contactId);
    if (contact) {
      await db.runAsync('UPDATE books SET updated_at = ? WHERE id = ?', [now, contact.book_id]);
    }

    return {
      id,
      contact_id: contactId,
      type,
      amount,
      note,
      transaction_date: transactionDate,
      created_at: now,
      updated_at: now,
    };
  },

  async updateTransaction(
    id: string,
    type: TransactionType,
    amount: number,
    note: string,
    transactionDate: string
  ): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    await db.runAsync(
      'UPDATE transactions SET type = ?, amount = ?, note = ?, transaction_date = ?, updated_at = ? WHERE id = ?',
      [type, amount, note, transactionDate, now, id]
    );

    const tx = await this.getTransactionById(id);
    if (tx) {
      await db.runAsync('UPDATE contacts SET updated_at = ? WHERE id = ?', [now, tx.contact_id]);
      const contact = await this.getContactById(tx.contact_id);
      if (contact) {
        await db.runAsync('UPDATE books SET updated_at = ? WHERE id = ?', [now, contact.book_id]);
      }
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    const db = getDb();
    const tx = await this.getTransactionById(id);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

    if (tx) {
      const now = new Date().toISOString();
      await db.runAsync('UPDATE contacts SET updated_at = ? WHERE id = ?', [now, tx.contact_id]);
      const contact = await this.getContactById(tx.contact_id);
      if (contact) {
        await db.runAsync('UPDATE books SET updated_at = ? WHERE id = ?', [now, contact.book_id]);
      }
    }
  },

  async getTransactionsForContact(contactId: string): Promise<Transaction[]> {
    const db = getDb();
    return await db.getAllAsync<Transaction>(
      'SELECT * FROM transactions WHERE contact_id = ? ORDER BY transaction_date DESC, created_at DESC',
      [contactId]
    );
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const db = getDb();
    return await db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
  },

  async getRecentTransactions(limit = 10): Promise<Transaction[]> {
    const db = getDb();
    const sql = `
      SELECT t.*, c.name as contact_name
      FROM transactions t
      JOIN contacts c ON t.contact_id = c.id
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ?
    `;
    return await db.getAllAsync<Transaction>(sql, [limit]);
  },

  async getTransactionsInBook(
    bookId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<Transaction & { contact_name: string }>> {
    const db = getDb();
    let sql = `
      SELECT t.*, c.name as contact_name
      FROM transactions t
      JOIN contacts c ON t.contact_id = c.id
      WHERE c.book_id = ?
    `;
    const params: any[] = [bookId];

    if (startDate) {
      sql += ' AND t.transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND t.transaction_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
    return await db.getAllAsync<any>(sql, params);
  },

  // ==========================================
  // AGGREGATE STATS & SEARCH
  // ==========================================

  async getDashboardStats(): Promise<{
    totalBooks: number;
    totalContacts: number;
    totalPending: number; // Sum of positive pending balances (Gave > Received)
    totalExtraReceived: number; // Sum of negative balances (Received > Gave)
    totalGiven: number; // Raw sum of all GAVE transactions
    totalReceived: number; // Raw sum of all RECEIVED transactions
  }> {
    const db = getDb();

    // Counts
    const booksCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM books WHERE is_archived = 0');
    const contactsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM contacts');

    // Totals
    const txTotals = await db.getFirstAsync<{ total_gave: number; total_received: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'GAVE' THEN amount ELSE 0 END), 0) as total_gave,
        COALESCE(SUM(CASE WHEN type = 'RECEIVED' THEN amount ELSE 0 END), 0) as total_received
      FROM transactions
    `);

    // Sum of positive pending balances (debts)
    // We get balances per contact and aggregate
    const contactBalances = await db.getAllAsync<{ net: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'GAVE' THEN amount ELSE -amount END), 0) as net
      FROM transactions
      GROUP BY contact_id
    `);

    let totalPending = 0;
    let totalExtraReceived = 0;

    if (contactBalances) {
      for (const cb of contactBalances) {
        if (cb.net > 0) {
          totalPending += cb.net;
        } else if (cb.net < 0) {
          totalExtraReceived += Math.abs(cb.net);
        }
      }
    }

    return {
      totalBooks: booksCount?.count || 0,
      totalContacts: contactsCount?.count || 0,
      totalPending,
      totalExtraReceived,
      totalGiven: txTotals?.total_gave || 0,
      totalReceived: txTotals?.total_received || 0,
    };
  },

  async getTopDebtors(limit = 5): Promise<Array<{ contactId: string; name: string; phone: string; balance: number; bookName: string }>> {
    const db = getDb();
    
    const sql = `
      SELECT 
        c.id as contactId,
        c.name,
        c.phone_number as phone,
        b.name as bookName,
        (COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'GAVE'), 0) -
         COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'RECEIVED'), 0)) as balance
      FROM contacts c
      JOIN books b ON c.book_id = b.id
      WHERE b.is_archived = 0
      GROUP BY c.id
      HAVING balance > 0
      ORDER BY balance DESC
      LIMIT ?
    `;

    return await db.getAllAsync<any>(sql, [limit]);
  },

  async globalSearch(query: string): Promise<{ books: Book[]; contacts: Contact[] }> {
    const db = getDb();
    const searchQuery = `%${query}%`;

    // Search Books
    const booksSql = `
      SELECT b.*,
        (SELECT COUNT(*) FROM contacts c WHERE c.book_id = b.id) as contact_count,
        COALESCE(
          (SELECT SUM(CASE WHEN t.type = 'GAVE' THEN t.amount ELSE -t.amount END)
           FROM transactions t
           JOIN contacts c ON t.contact_id = c.id
           WHERE c.book_id = b.id),
          0
        ) as net_balance
      FROM books b
      WHERE b.name LIKE ? AND b.is_archived = 0
      ORDER BY b.name ASC
    `;
    const books = await db.getAllAsync<any>(booksSql, [searchQuery]);

    // Search Contacts
    const contactsSql = `
      SELECT c.*,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'GAVE'), 0) as total_gave,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'RECEIVED'), 0) as total_received
      FROM contacts c
      WHERE c.name LIKE ? OR c.phone_number LIKE ?
      ORDER BY c.name ASC
    `;
    const contactsRows = await db.getAllAsync<any>(contactsSql, [searchQuery, searchQuery]);
    const contacts = contactsRows.map((row) => ({
      ...row,
      net_balance: row.total_gave - row.total_received,
    }));

    return {
      books: books.map((row: any) => ({ ...row, is_archived: row.is_archived === 1 })),
      contacts,
    };
  },

  // ==========================================
  // BACKUP OPERATIONS (EXPORTS AND IMPORTS RAW JSON)
  // ==========================================
  
  async getRawDatabaseData(): Promise<{
    books: any[];
    contacts: any[];
    transactions: any[];
  }> {
    const db = getDb();
    const books = await db.getAllAsync('SELECT * FROM books');
    const contacts = await db.getAllAsync('SELECT * FROM contacts');
    const transactions = await db.getAllAsync('SELECT * FROM transactions');

    return {
      books,
      contacts,
      transactions,
    };
  },

  async restoreRawDatabaseData(data: {
    books: any[];
    contacts: any[];
    transactions: any[];
  }): Promise<void> {
    const db = getDb();
    
    // Clear everything inside a single transaction
    await db.withTransactionAsync(async () => {
      // Temporarily disable foreign keys to avoid cascade order deletion issues during restore
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      
      await db.runAsync('DELETE FROM transactions');
      await db.runAsync('DELETE FROM contacts');
      await db.runAsync('DELETE FROM books');

      // Re-insert books
      for (const book of data.books) {
        await db.runAsync(
          'INSERT INTO books (id, name, description, created_at, updated_at, is_archived) VALUES (?, ?, ?, ?, ?, ?)',
          [book.id, book.name, book.description, book.created_at, book.updated_at, book.is_archived]
        );
      }

      // Re-insert contacts
      for (const contact of data.contacts) {
        await db.runAsync(
          'INSERT INTO contacts (id, book_id, name, phone_number, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [contact.id, contact.book_id, contact.name, contact.phone_number, contact.address, contact.notes, contact.created_at, contact.updated_at]
        );
      }

      // Re-insert transactions
      for (const tx of data.transactions) {
        await db.runAsync(
          'INSERT INTO transactions (id, contact_id, type, amount, note, transaction_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [tx.id, tx.contact_id, tx.type, tx.amount, tx.note, tx.transaction_date, tx.created_at, tx.updated_at]
        );
      }

      // Re-enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');
    });
  }
};
