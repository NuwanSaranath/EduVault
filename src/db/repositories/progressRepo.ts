import { EMPTY_SNAPSHOT, type ProgressSnapshot } from '@/features/progress/snapshot';
import { getDb } from '../index';
import { enqueue } from './outboxRepo';

/**
 * Persistence for the aggregate progress counters (XP, streak, completion sets).
 *
 * Unlike attempts, this is a single mutable document rather than an event log,
 * so it is the one entity that genuinely needs a merge strategy. It lives in
 * `sync_meta` because there is exactly one row per user — a dedicated table
 * would be a one-row table.
 *
 * The shape itself is declared in features/progress/snapshot, not here, so the
 * merge strategies and their tests can use it without pulling SQLite (and its
 * native dependencies) into pure logic.
 */
export { EMPTY_SNAPSHOT, type ProgressSnapshot };

const SNAPSHOT_KEY = 'progress:snapshot';

export async function readSnapshot(): Promise<ProgressSnapshot> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    SNAPSHOT_KEY,
  );
  if (!row) return EMPTY_SNAPSHOT;
  try {
    return { ...EMPTY_SNAPSHOT, ...(JSON.parse(row.value) as ProgressSnapshot) };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/**
 * Writes the snapshot locally and queues a push.
 *
 * `op: 'update'` rather than 'create' because the push side merges against
 * whatever the server already holds instead of overwriting it.
 */
export async function writeSnapshot(snapshot: ProgressSnapshot): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      SNAPSHOT_KEY,
      JSON.stringify(snapshot),
    );
    await enqueue(db, {
      entity: 'progress',
      op: 'update',
      entityId: 'summary',
      payload: snapshot,
    });
  });
}

/** Local write with no push — used when applying a pulled remote snapshot. */
export async function writeSnapshotQuiet(snapshot: ProgressSnapshot): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    SNAPSHOT_KEY,
    JSON.stringify(snapshot),
  );
}

// ── Pull cursors ───────────────────────────────────────────────────────────

export async function getCursor(collection: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    `cursor:${collection}`,
  );
  return row?.value ?? null;
}

export async function setCursor(collection: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    `cursor:${collection}`,
    value,
  );
}
