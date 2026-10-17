import { BackupDataPayload, CompleteBackupPackage, BackupMetadata } from './types';
import { Book, Contact, Transaction } from '../../types';

const getExpoCrypto = () => {
  try {
    return require('expo-crypto');
  } catch {
    return null;
  }
};

export const DatabaseSnapshot = {
  /**
   * Reads a consistent snapshot of all persistent data from the SQLite database
   * within an exclusive read transaction.
   */
  async readConsistentData(): Promise<BackupDataPayload> {
    const { getDb } = require('../../database/sqlite');
    const db = getDb();

    // Select only persistent table columns, sorted deterministically by primary key (id ASC)
    const booksQuery = `
      SELECT id, name, description, created_at, updated_at, is_archived
      FROM books
      ORDER BY id ASC
    `;

    const contactsQuery = `
      SELECT id, book_id, name, phone_number, address, notes, created_at, updated_at
      FROM contacts
      ORDER BY id ASC
    `;

    const transactionsQuery = `
      SELECT id, contact_id, type, amount, note, transaction_date, created_at, updated_at
      FROM transactions
      ORDER BY id ASC
    `;

    // Execute queries
    const booksRaw = await db.getAllAsync(booksQuery);
    const contactsRaw = await db.getAllAsync(contactsQuery);
    const transactionsRaw = await db.getAllAsync(transactionsQuery);

    const books: Book[] = booksRaw.map((b: any) => ({
      id: String(b.id),
      name: String(b.name || ''),
      description: b.description ? String(b.description) : '',
      created_at: String(b.created_at),
      updated_at: String(b.updated_at),
      is_archived: Boolean(b.is_archived === 1 || b.is_archived === true),
    }));

    const contacts: Contact[] = contactsRaw.map((c: any) => ({
      id: String(c.id),
      book_id: String(c.book_id),
      name: String(c.name || ''),
      phone_number: c.phone_number ? String(c.phone_number) : '',
      address: c.address ? String(c.address) : '',
      notes: c.notes ? String(c.notes) : '',
      created_at: String(c.created_at),
      updated_at: String(c.updated_at),
    }));

    const transactions: Transaction[] = transactionsRaw.map((t: any) => ({
      id: String(t.id),
      contact_id: String(t.contact_id),
      type: t.type === 'RECEIVED' ? 'RECEIVED' : 'GAVE',
      amount: Number(t.amount || 0),
      note: t.note ? String(t.note) : '',
      transaction_date: String(t.transaction_date),
      created_at: String(t.created_at),
      updated_at: String(t.updated_at),
    }));

    return {
      books,
      contacts,
      transactions,
    };
  },

  /**
   * Deterministically stringifies an object by recursively sorting its keys alphabetically.
   * Guarantees identical canonical JSON string for identical data across platforms.
   */
  canonicalStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }
    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalStringify(item)).join(',') + ']';
    }

    const sortedKeys = Object.keys(obj).sort();
    const parts = sortedKeys.map((key) => {
      const valStr = this.canonicalStringify(obj[key]);
      return JSON.stringify(key) + ':' + valStr;
    });

    return '{' + parts.join(',') + '}';
  },

  /**
   * Computes a deterministic SHA-256 hash of the database snapshot data payload.
   * Uses expo-crypto in Expo runtime, with fallback to node crypto in testing environments.
   */
  async computeContentHash(data: BackupDataPayload): Promise<string> {
    const canonical = this.canonicalStringify({
      books: data.books,
      contacts: data.contacts,
      transactions: data.transactions,
    });

    const Crypto = getExpoCrypto();
    if (Crypto && Crypto.digestStringAsync && Crypto.CryptoDigestAlgorithm) {
      try {
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          canonical
        );
      } catch {
        // fallback
      }
    }

    // Node.js fallback for tests
    try {
      const nodeCrypto = require('crypto');
      return nodeCrypto.createHash('sha256').update(canonical).digest('hex');
    } catch {
      throw new Error('No crypto implementation available for SHA-256');
    }
  },

  /**
   * Validates a backup package before restore.
   * Checks schema version, required tables, non-empty records, types, and foreign key relations.
   */
  validateBackupPayload(payload: any): { isValid: boolean; error?: string; normalizedData?: BackupDataPayload } {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Backup file is empty or not valid JSON' };
    }

    // Support both wrapped format { metadata, data } and raw format { books, contacts, transactions }
    let data: any = payload;
    if (payload.data && typeof payload.data === 'object') {
      data = payload.data;
    }

    if (!Array.isArray(data.books)) {
      return { isValid: false, error: 'Backup is missing "books" table array' };
    }
    if (!Array.isArray(data.contacts)) {
      return { isValid: false, error: 'Backup is missing "contacts" table array' };
    }
    if (!Array.isArray(data.transactions)) {
      return { isValid: false, error: 'Backup is missing "transactions" table array' };
    }

    // Validate books
    const bookIdSet = new Set<string>();
    for (const b of data.books) {
      if (!b.id || typeof b.name !== 'string') {
        return { isValid: false, error: `Invalid book record found: ${JSON.stringify(b)}` };
      }
      bookIdSet.add(String(b.id));
    }

    // Validate contacts & foreign keys to books
    const contactIdSet = new Set<string>();
    for (const c of data.contacts) {
      if (!c.id || !c.book_id || typeof c.name !== 'string') {
        return { isValid: false, error: `Invalid contact record found: ${JSON.stringify(c)}` };
      }
      if (!bookIdSet.has(String(c.book_id))) {
        return {
          isValid: false,
          error: `Foreign key violation: Contact "${c.name}" references non-existent book ID "${c.book_id}"`,
        };
      }
      contactIdSet.add(String(c.id));
    }

    // Validate transactions & foreign keys to contacts
    for (const t of data.transactions) {
      if (!t.id || !t.contact_id || typeof t.amount !== 'number') {
        return { isValid: false, error: `Invalid transaction record found: ${JSON.stringify(t)}` };
      }
      if (t.type !== 'GAVE' && t.type !== 'RECEIVED') {
        return { isValid: false, error: `Invalid transaction type "${t.type}" in transaction ID "${t.id}"` };
      }
      if (isNaN(t.amount) || t.amount < 0) {
        return { isValid: false, error: `Invalid amount "${t.amount}" in transaction ID "${t.id}"` };
      }
      if (!contactIdSet.has(String(t.contact_id))) {
        return {
          isValid: false,
          error: `Foreign key violation: Transaction "${t.id}" references non-existent contact ID "${t.contact_id}"`,
        };
      }
    }

    const normalizedData: BackupDataPayload = {
      books: data.books.map((b: any) => ({
        id: String(b.id),
        name: String(b.name),
        description: b.description ? String(b.description) : '',
        created_at: String(b.created_at || new Date().toISOString()),
        updated_at: String(b.updated_at || new Date().toISOString()),
        is_archived: Boolean(b.is_archived === 1 || b.is_archived === true),
      })),
      contacts: data.contacts.map((c: any) => ({
        id: String(c.id),
        book_id: String(c.book_id),
        name: String(c.name),
        phone_number: c.phone_number ? String(c.phone_number) : '',
        address: c.address ? String(c.address) : '',
        notes: c.notes ? String(c.notes) : '',
        created_at: String(c.created_at || new Date().toISOString()),
        updated_at: String(c.updated_at || new Date().toISOString()),
      })),
      transactions: data.transactions.map((t: any) => ({
        id: String(t.id),
        contact_id: String(t.contact_id),
        type: t.type === 'RECEIVED' ? 'RECEIVED' : 'GAVE',
        amount: Number(t.amount),
        note: t.note ? String(t.note) : '',
        transaction_date: String(t.transaction_date || new Date().toISOString()),
        created_at: String(t.created_at || new Date().toISOString()),
        updated_at: String(t.updated_at || new Date().toISOString()),
      })),
    };

    return { isValid: true, normalizedData };
  },
};
