import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../index';

// what the sync engine can push
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
  // set if there's a photo, so syncPlan can hold it for wifi
  mediaUri?: string;
}

// add a change to the outbox. takes db so it can be in the same
// transaction as the local write (see attemptRepo.saveAttempt)
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

// oldest first. includeMedia false skips photo rows so text can still sync
// on mobile data
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

// pushed ok, remove from outbox
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

// for the banner, doesn't count dead letters
export async function pendingCount(maxAttempts: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM outbox WHERE attempts < ?',
    maxAttempts,
  );
  return row?.n ?? 0;
}

// rows that gave up, shown in settings so they aren't lost
export async function deadLetters(maxAttempts: number): Promise<OutboxRow[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxRow>(
    'SELECT * FROM outbox WHERE attempts >= ? ORDER BY created_at ASC',
    maxAttempts,
  );
}

export async function retryDeadLetters(): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE outbox SET attempts = 0, last_error = NULL');
}
