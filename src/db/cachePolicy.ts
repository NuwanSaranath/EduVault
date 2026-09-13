import { getDb } from './index';

/**
 * Constrained-design policy #2: a hard ceiling on cached lesson content with
 * least-recently-used eviction.
 *
 * The target device is a mid-range Android phone that a student also uses for
 * everything else, so the app cannot assume it may grow without bound. Rather
 * than trusting the OS to reclaim space (which on Android means the app data is
 * cleared wholesale, losing the outbox with it), EduVault enforces its own
 * budget and chooses what to drop.
 *
 * Two rules make the eviction safe:
 *   1. Bookmarked lessons are pinned — a deliberate save outranks the budget.
 *   2. Only `lessons` is evictable. Questions and papers are small, and user
 *      data is never evictable because it may not have synced yet.
 */
export const CACHE_LIMIT_BYTES = 40 * 1024 * 1024; // 40 MB

/** Evict in batches so one pass cannot stall the JS thread on a huge cache. */
const EVICTION_BATCH = 25;

export interface CacheUsage {
  usedBytes: number;
  limitBytes: number;
  lessonCount: number;
  pinnedCount: number;
}

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

/**
 * Drops cold lessons until usage is back under the ceiling.
 *
 * Ordering detail: `last_read_at IS NULL DESC` puts never-read lessons first —
 * content that was pulled in a sync but never opened is the cheapest thing to
 * lose, since re-fetching it costs the user nothing they noticed having.
 *
 * @returns ids that were evicted, for logging and for the Settings screen.
 */
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

  // Loop rather than one big DELETE: we must subtract each row's real byte
  // count to know when to stop, and a single query cannot express that.
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

/** Settings action: clear all unpinned content, keeping user data intact. */
export async function clearUnpinnedCache(): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'DELETE FROM lessons WHERE id NOT IN (SELECT lesson_id FROM bookmarks)',
  );
  return result.changes;
}
