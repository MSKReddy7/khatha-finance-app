import crypto from 'crypto';
import { DatabaseSnapshot } from '../src/services/cloudBackup/DatabaseSnapshot';
import { DeviceIdentity } from '../src/services/cloudBackup/DeviceIdentity';
import { SequenceCoordinator } from '../src/services/cloudBackup/SequenceCoordinator';
import { RetentionService } from '../src/services/cloudBackup/RetentionService';
import { CloudBackupItem, BackupDataPayload } from '../src/services/cloudBackup/types';

// Simple assert helper
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function computeNodeSha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

console.log('\n========================================');
console.log('🧪 RUNNING KHATHA CLOUD BACKUP TEST SUITE');
console.log('========================================\n');

// ----------------------------------------------------
// TEST GROUP 1: Canonical Serialization and Hashing
// ----------------------------------------------------
console.log('Test Group 1: Canonical Serialization & Deterministic Hashing');

const sampleDataA: BackupDataPayload = {
  books: [
    {
      id: 'book-1',
      name: 'Personal Lending',
      description: 'Family loans',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      is_archived: false,
    },
  ],
  contacts: [
    {
      id: 'contact-1',
      book_id: 'book-1',
      name: 'Manoj',
      phone_number: '9876543210',
      address: 'Hyderabad',
      notes: 'Friend',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'tx-1',
      contact_id: 'contact-1',
      type: 'GAVE',
      amount: 5000,
      note: 'Emergency help',
      transaction_date: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    },
  ],
};

// Same data with different key insertion order in JavaScript objects
const sampleDataA_Shuffled: BackupDataPayload = {
  books: [
    {
      description: 'Family loans',
      name: 'Personal Lending',
      is_archived: false,
      updated_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      id: 'book-1',
    },
  ],
  contacts: [
    {
      address: 'Hyderabad',
      name: 'Manoj',
      notes: 'Friend',
      phone_number: '9876543210',
      book_id: 'book-1',
      updated_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      id: 'contact-1',
    },
  ],
  transactions: [
    {
      amount: 5000,
      transaction_date: '2026-01-02T00:00:00.000Z',
      contact_id: 'contact-1',
      note: 'Emergency help',
      type: 'GAVE',
      id: 'tx-1',
      updated_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ],
};

const canonicalA = DatabaseSnapshot.canonicalStringify(sampleDataA);
const canonicalA_Shuffled = DatabaseSnapshot.canonicalStringify(sampleDataA_Shuffled);

assert(
  canonicalA === canonicalA_Shuffled,
  'Identical data with different object key ordering produces exact identical canonical JSON'
);

const hashA = computeNodeSha256(canonicalA);
const hashA_Shuffled = computeNodeSha256(canonicalA_Shuffled);

assert(hashA === hashA_Shuffled, 'Identical data produces identical SHA-256 hash');

// Mutated data (e.g. amount changed from 5000 to 6000)
const sampleDataB: BackupDataPayload = {
  ...sampleDataA,
  transactions: [
    {
      ...sampleDataA.transactions[0],
      amount: 6000,
    },
  ],
};

const canonicalB = DatabaseSnapshot.canonicalStringify(sampleDataB);
const hashB = computeNodeSha256(canonicalB);

assert(hashA !== hashB, 'Different database data produces completely different SHA-256 hash');

// ----------------------------------------------------
// TEST GROUP 2: Device Identity & Filename Sanitization & Parsing
// ----------------------------------------------------
console.log('\nTest Group 2: Device Identity & Filename Handling');

const rawDeviceName = 'Manoj / Office Phone: "Test" <#1>';
const sanitizedName = DeviceIdentity.sanitizeDeviceNameForFileName(rawDeviceName);

assert(
  !/[\/\\?%*:|"<>~#]/.test(sanitizedName),
  `Device name sanitized cleanly: "${rawDeviceName}" -> "${sanitizedName}"`
);

const testDate = new Date(Date.UTC(2026, 9, 17, 21, 30, 45)); // 2026-10-17 21:30:45 UTC
const fileName = SequenceCoordinator.generateBackupFileName(104, 'Manoj Phone', testDate);

assert(
  fileName === '104 Manoj Phone 2026-10-17_21-30-45.json',
  `Backup filename generated correctly: "${fileName}"`
);

const parsed = SequenceCoordinator.parseBackupFileName('104 Manoj Phone 2026-10-17_21-30-45.json');
assert(parsed !== null, 'Valid filename parsed successfully');
assert(parsed?.backupId === 104, 'Parsed backup ID is 104');
assert(parsed?.deviceName === 'Manoj Phone', 'Parsed device name is "Manoj Phone"');
assert(parsed?.timestamp === '2026-10-17_21-30-45', 'Parsed timestamp matches expected UTC pattern');

const parsedInvalid = SequenceCoordinator.parseBackupFileName('random_text_file.txt');
assert(parsedInvalid === null, 'Non-conforming filename correctly returns null');

// ----------------------------------------------------
// TEST GROUP 3: Per-Device Retention Rules (Latest 10 Per Device)
// ----------------------------------------------------
console.log('\nTest Group 3: Per-Device Retention Enforcement');

// Create 12 backups for Device A and 5 backups for Device B
const mockBackups: CloudBackupItem[] = [];

// Device A: IDs 101 to 112 (12 backups)
for (let id = 101; id <= 112; id++) {
  mockBackups.push({
    id: `file-device-a-${id}`,
    name: `${id} Device A 2026-10-17_10-00-00.json`,
    backupId: id,
    deviceId: 'device-a-uuid',
    deviceName: 'Device A',
    createdTime: new Date(Date.UTC(2026, 9, id - 100, 10, 0, 0)).toISOString(),
    modifiedTime: new Date(Date.UTC(2026, 9, id - 100, 10, 0, 0)).toISOString(),
    isValid: true,
    isCurrentDevice: true,
  });
}

// Device B: IDs 201 to 205 (5 backups)
for (let id = 201; id <= 205; id++) {
  mockBackups.push({
    id: `file-device-b-${id}`,
    name: `${id} Device B 2026-10-17_10-00-00.json`,
    backupId: id,
    deviceId: 'device-b-uuid',
    deviceName: 'Device B',
    createdTime: new Date(Date.UTC(2026, 9, id - 200, 10, 0, 0)).toISOString(),
    modifiedTime: new Date(Date.UTC(2026, 9, id - 200, 10, 0, 0)).toISOString(),
    isValid: true,
    isCurrentDevice: false,
  });
}

const toPruneDeviceA = RetentionService.getBackupsToPrune(mockBackups, 'device-a-uuid', 10);
assert(toPruneDeviceA.length === 2, 'Device A has 12 backups -> exactly 2 oldest backups marked for pruning');

// Check that the pruned ones are the OLDEST (101 and 102) and NOT the newest (112)
const prunedIds = toPruneDeviceA.map((b) => b.backupId);
assert(
  prunedIds.includes(101) && prunedIds.includes(102),
  'The pruned backups are indeed the oldest backups (IDs 101 and 102)'
);
assert(!prunedIds.includes(112), 'The newest backup (ID 112) is strictly protected and retained');

// Device B retention check
const toPruneDeviceB = RetentionService.getBackupsToPrune(mockBackups, 'device-b-uuid', 10);
assert(toPruneDeviceB.length === 0, 'Device B has 5 backups (<= 10) -> 0 backups pruned');

// Verify Device A pruning never contains Device B backups
const containsDeviceB = toPruneDeviceA.some((b) => b.deviceId === 'device-b-uuid');
assert(!containsDeviceB, "Device A pruning NEVER deletes Device B's backups");

// ----------------------------------------------------
// TEST GROUP 4: Payload Validation and Foreign Key Protection
// ----------------------------------------------------
console.log('\nTest Group 4: Payload Validation & Foreign Key Protection');

// Valid payload
const validResult = DatabaseSnapshot.validateBackupPayload({
  data: sampleDataA,
});
assert(validResult.isValid, 'Valid backup payload passes schema validation');

// Missing table
const missingTableResult = DatabaseSnapshot.validateBackupPayload({
  data: {
    books: sampleDataA.books,
    // contacts missing
    transactions: sampleDataA.transactions,
  },
});
assert(!missingTableResult.isValid, 'Missing contacts table is safely rejected');

// Foreign key violation: contact references non-existent book
const invalidContactFk: BackupDataPayload = {
  books: sampleDataA.books,
  contacts: [
    {
      id: 'contact-x',
      book_id: 'non-existent-book-id',
      name: 'Ravi',
      phone_number: '1234567890',
      address: '',
      notes: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
  transactions: [],
};

const fkContactResult = DatabaseSnapshot.validateBackupPayload({ data: invalidContactFk });
assert(!fkContactResult.isValid, 'Foreign key violation (contact references non-existent book) is rejected');
assert(
  fkContactResult.error?.includes('Foreign key violation') ?? false,
  'Error message accurately explains foreign key violation'
);

// Foreign key violation: transaction references non-existent contact
const invalidTxFk: BackupDataPayload = {
  books: sampleDataA.books,
  contacts: sampleDataA.contacts,
  transactions: [
    {
      id: 'tx-orphan',
      contact_id: 'non-existent-contact-id',
      type: 'GAVE',
      amount: 1000,
      note: '',
      transaction_date: '2026-01-01',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
};

const fkTxResult = DatabaseSnapshot.validateBackupPayload({ data: invalidTxFk });
assert(!fkTxResult.isValid, 'Foreign key violation (transaction references non-existent contact) is rejected');

// Invalid transaction amount
const invalidAmountTx: BackupDataPayload = {
  ...sampleDataA,
  transactions: [
    {
      ...sampleDataA.transactions[0],
      amount: -500,
    },
  ],
};

const amountResult = DatabaseSnapshot.validateBackupPayload({ data: invalidAmountTx });
assert(!amountResult.isValid, 'Negative transaction amount is rejected');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n========================================');
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
