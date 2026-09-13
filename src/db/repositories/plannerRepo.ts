import type { PlannerEvent } from '@/types';
import { getDb } from '../index';
import { enqueue } from './outboxRepo';

interface Row {
  payload: string;
  updated_at: string;
}

/**
 * Planner events are the one genuinely mutable user entity, so rows carry an
 * `updated_at` and sync under last-write-wins. Deletes are soft (deleted = 1)
 * so the tombstone survives long enough to be pushed; the row is dropped only
 * once the remote delete is acknowledged.
 */
export async function upsertEvent(event: PlannerEvent): Promise<void> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO planner_events (id, payload, updated_at, deleted, synced)
         VALUES (?, ?, ?, 0, 0)`,
      event.id,
      JSON.stringify(event),
      updatedAt,
    );
    await enqueue(db, {
      entity: 'plannerEvent',
      op: 'update',
      entityId: event.id,
      payload: { ...event, updatedAt },
    });
  });
}

export async function softDeleteEvent(eventId: string): Promise<void> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE planner_events SET deleted = 1, synced = 0, updated_at = ? WHERE id = ?',
      updatedAt,
      eventId,
    );
    await enqueue(db, {
      entity: 'plannerEvent',
      op: 'delete',
      entityId: eventId,
      payload: { id: eventId, updatedAt },
    });
  });
}

/** Hard-removes a tombstone once the remote delete succeeded. */
export async function purgeEvent(eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM planner_events WHERE id = ?', eventId);
}

export async function markEventSynced(eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE planner_events SET synced = 1 WHERE id = ?', eventId);
}

export async function getEvents(): Promise<PlannerEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT payload, updated_at FROM planner_events WHERE deleted = 0',
  );
  return rows.map((r) => JSON.parse(r.payload) as PlannerEvent);
}

export async function getEventUpdatedAt(eventId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM planner_events WHERE id = ?',
    eventId,
  );
  return row?.updated_at ?? null;
}
