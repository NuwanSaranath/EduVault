import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../index';

/** Collections the sync engine knows how to push. */
export type OutboxEntity =
  | 'quizAttempt'
  | 'paperResult'
  | 'plannerEvent'
  | 'progress'
  | 'bookmark'
  | 'tutorQuestion';

export type OutboxOp = 'create' | 'update' | 'delete';

export interface OutboxRow {
  id: number;
  entity: OutboxEntity;
  op: OutboxOp;
  entity_id: string;
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
  needs_media: number;
  media_uri: string | null;
}

export interface EnqueueInput {
  entity: OutboxEntity;
  op: OutboxOp;
  entityId: string;
  payload: unknown;
  /** Set for mutations carrying an image, so `syncPlan` can defer them. */
  mediaUri?: string;
}

/**
 * Appends a mutation to the outbox.
 *
 * Takes an explicit `db` so callers can enlist it in the same transaction as
 * their local write — see `attemptRepo.saveAttempt`.
 */
export async function enqueue(db: SQLiteDatabase, input: EnqueueInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO outbox (entity, op, entity_id, payload, created_at, needs_media, media_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.entity,
    input.op,
    input.entityId,
    JSON.stringify(input.payload),
    new Date().toISOString(),
    input.mediaUri ? 1 : 0,
    input.mediaUri ?? null,
  );
}

/**
 * Oldest-first batch of still-viable mutations.
 *
 * `includeMedia: false` skips image-bearing rows so a metered connection can
 * still flush text while photos wait for Wi-Fi.
 */
export async function nextBatch(
  maxAttempts: number,
  limit: number,
  includeMedia: boolean,
): Promise<OutboxRow[]> {
  const db = await getDb();
  const mediaClause = includeMedia ? '' : 'AND needs_media = 0';
  return db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox
       WHERE attempts < ? ${mediaClause}
       ORDER BY created_at ASC, id ASC
       LIMIT ?`,
    maxAttempts,
    limit,
  );
}

export async function markSucceeded(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
}

export async function markFailed(id: number, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    error.slice(0, 500),
    id,
  );
}

/** Count shown in the offline banner. Excludes rows that exhausted retries. */
export async function pendingCount(maxAttempts: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM outbox WHERE attempts < ?',
    maxAttempts,
  );
  return row?.n ?? 0;
}

/** Rows that gave up — surfaced in Settings so they are not silently lost. */
export async function deadLetters(maxAttempts: number): Promise<OutboxRow[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxRow>(
    'SELECT * FROM outbox WHERE attempts >= ? ORDER BY created_at ASC',
    maxAttempts,
  );
}

/** Resets the attempt counter so dead letters get another chance. */
export async function retryDeadLetters(): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE outbox SET attempts = 0, last_error = NULL');
}
