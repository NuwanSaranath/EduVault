import { getDb } from './index';

// Lesson cache limit, deletes least recently used lessons when over.
// Students use cheap android phones for everything else too, and if android
// clears our data itself we lose the outbox. So we keep our own limit.
// - bookmarked lessons are never deleted
// - only lessons get deleted. questions/papers are small and user data might
//   not be synced yet
export const CACHE_LIMIT_BYTES = 40 * 1024 * 1024; // 40 MB

// delete in batches so it doesn't freeze the js thread
const EVICTION_BATCH = 25;

export interface CacheUsage {
  usedBytes: number;
  limitBytes: number;
  lessonCount: number;
  pinnedCount: number;
}

// numbers for the storage panel in settings
export async function getCacheUsage(): Promise<CacheUsage> {
  const db = await getDb();
  const totals = await db.getFirstAsync<{ total: number; n: number }>(
    'SELECT COALESCE(SUM(bytes), 0) AS total, COUNT(*) AS n FROM lessons',
  );
  const pinned = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM bookmarks');
  return {
    usedBytes: totals?.total ?? 0,
    limitBytes: CACHE_LIMIT_BYTES,
    lessonCount: totals?.n ?? 0,
    pinnedCount: pinned?.n ?? 0,
  };
}

// delete old lessons until we're under the limit. never opened lessons go
// first (last_read_at IS NULL DESC) since nobody will miss them.
// returns the deleted ids
export async function enforceCacheBudget(
  limitBytes: number = CACHE_LIMIT_BYTES,
): Promise<string[]> {
  const db = await getDb();
  const evicted: string[] = [];

  const initial = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(bytes), 0) AS total FROM lessons',
  );
  let used = initial?.total ?? 0;
  if (used <= limitBytes) return evicted;

  // loop instead of one DELETE, we need to subtract each row's size to know
  // when to stop
  for (;;) {
    const victims = await db.getAllAsync<{ id: string; bytes: number }>(
      `SELECT id, bytes FROM lessons
         WHERE id NOT IN (SELECT lesson_id FROM bookmarks)
         ORDER BY last_read_at IS NULL DESC, last_read_at ASC
         LIMIT ?`,
      EVICTION_BATCH,
    );
    if (victims.length === 0) break; // everything left is pinned

    for (const victim of victims) {
      if (used <= limitBytes) break;
      await db.runAsync('DELETE FROM lessons WHERE id = ?', victim.id);
      used -= victim.bytes;
      evicted.push(victim.id);
    }

    if (used <= limitBytes) break;
  }

  return evicted;
}

// settings button: clear lessons that aren't bookmarked
export async function clearUnpinnedCache(): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'DELETE FROM lessons WHERE id NOT IN (SELECT lesson_id FROM bookmarks)',
  );
  return result.changes;
}
