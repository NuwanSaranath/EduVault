import { getDb, runInTransaction } from '../index';
import { enqueue } from './outboxRepo';

// bookmarked lessons are also protected from the cache cleanup, so a saved
// lesson is always there offline
export async function addBookmark(lessonId: string): Promise<void> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  await runInTransaction(db, async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO bookmarks (lesson_id, created_at, synced) VALUES (?, ?, 0)',
      lessonId,
      createdAt,
    );
    await enqueue(db, {
      entity: 'bookmark',
      op: 'create',
      entityId: lessonId,
      payload: { lessonId, createdAt },
    });
  });
}

export async function removeBookmark(lessonId: string): Promise<void> {
  const db = await getDb();
  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM bookmarks WHERE lesson_id = ?', lessonId);
    await enqueue(db, {
      entity: 'bookmark',
      op: 'delete',
      entityId: lessonId,
      payload: { lessonId },
    });
  });
}

export async function getBookmarkIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ lesson_id: string }>(
    'SELECT lesson_id FROM bookmarks ORDER BY created_at DESC',
  );
  return rows.map((r) => r.lesson_id);
}

export async function markBookmarkSynced(lessonId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE bookmarks SET synced = 1 WHERE lesson_id = ?', lessonId);
}
