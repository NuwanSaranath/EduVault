import { EMPTY_SNAPSHOT, type ProgressSnapshot } from '@/features/progress/snapshot';
import { getDb, runInTransaction } from '../index';
import { enqueue } from './outboxRepo';

// Saves xp, streak, completed chapters and badges.
// It's one object, not a log like attempts, so it needs merging on sync.
// Stored in sync_meta since it's only one row.
// The type lives in features/progress/snapshot so merge tests don't need sqlite.
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

// save locally and queue a push. op is 'update' because push merges with
// what's on the server instead of overwriting
export async function writeSnapshot(snapshot: ProgressSnapshot): Promise<void> {
  const db = await getDb();
  await runInTransaction(db, async () => {
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

// save without pushing, for when we got it from the server
export async function writeSnapshotQuiet(snapshot: ProgressSnapshot): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    SNAPSHOT_KEY,
    JSON.stringify(snapshot),
  );
}

// pull cursors

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

// last sync time

const LAST_SYNCED_KEY = 'sync:lastSyncedAt';

// kept in sqlite so we still have it after restarting the app offline
export async function getLastSyncedAt(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    LAST_SYNCED_KEY,
  );
  return row?.value ?? null;
}

export async function setLastSyncedAt(iso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    LAST_SYNCED_KEY,
    iso,
  );
}
