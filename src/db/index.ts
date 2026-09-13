import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_NAME, migrate } from './schema';

/**
 * One connection for the whole app.
 *
 * The sync engine runs off a NetInfo listener rather than a React render, so
 * it cannot reach a connection held in context. A module-level singleton lets
 * screens and the engine share the same handle — and WAL mode (set in
 * `migrate`) keeps a background drain from blocking a screen's read.
 */
let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

/** Called once from the root layout, before the first screen renders. */
export async function initDatabase(): Promise<void> {
  await getDb();
}

/** Test/debug helper: drops every row but keeps the schema. */
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
