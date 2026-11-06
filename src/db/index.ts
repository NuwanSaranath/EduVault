import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_NAME, migrate } from './schema';

// one db connection shared by everything. the sync engine runs outside
// react so it can't get it from context. WAL mode (in migrate) means a
// background sync doesn't block a screen reading
let dbPromise: Promise<SQLiteDatabase> | null = null;

// opens + migrates the db the first time
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

// last transaction in the queue, the next one waits for it
let transactionQueue: Promise<unknown> = Promise.resolve();

// run transactions one at a time.
// withTransactionAsync breaks if two run at once on the same connection
// ("cannot start a transaction within a transaction"). store writes don't
// await so this happens a lot, hence the queue.
// if one fails it rolls back and throws, but the next ones still run
export function runInTransaction<T>(
  db: SQLiteDatabase,
  task: () => Promise<T>,
): Promise<T> {
  const run = transactionQueue.then(async () => {
    let result!: T;
    await db.withTransactionAsync(async () => {
      result = await task();
    });
    return result;
  });
  transactionQueue = run.catch(() => undefined);
  return run;
}

// called once before the first screen shows
export async function initDatabase(): Promise<void> {
  await getDb();
}

// for tests/debug: delete all rows, keep the tables
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM outbox;
    DELETE FROM quiz_attempts;
    DELETE FROM paper_results;
    DELETE FROM planner_events;
    DELETE FROM bookmarks;
    DELETE FROM lessons;
    DELETE FROM chapters;
    DELETE FROM subjects;
    DELETE FROM questions;
    DELETE FROM past_papers;
    DELETE FROM sync_meta;
  `);
}

export { DATABASE_NAME, SCHEMA_VERSION } from './schema';
