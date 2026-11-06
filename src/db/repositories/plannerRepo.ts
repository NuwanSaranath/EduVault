import type { PlannerEvent } from '@/types';
import { getDb, runInTransaction } from '../index';
import { enqueue } from './outboxRepo';

interface Row {
  payload: string;
  updated_at: string;
}

// planner events can be edited so they have updated_at and use last write
// wins. delete is soft (deleted = 1) so the delete can still be pushed, the row
// is removed after firestore confirms
export async function upsertEvent(event: PlannerEvent): Promise<void> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  await runInTransaction(db, async () => {
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
  await runInTransaction(db, async () => {
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

// actually delete it after the remote delete worked
export async function purgeEvent(eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM planner_events WHERE id = ?', eventId);
}

export async function markEventSynced(eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE planner_events SET synced = 1 WHERE id = ?', eventId);
}

// not deleted ones
export async function getEvents(): Promise<PlannerEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT payload, updated_at FROM planner_events WHERE deleted = 0',
  );
  return rows.map((r) => JSON.parse(r.payload) as PlannerEvent);
}

// for last write wins
export async function getEventUpdatedAt(eventId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM planner_events WHERE id = ?',
    eventId,
  );
  return row?.updated_at ?? null;
}
