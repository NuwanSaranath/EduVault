import type { PlannerEvent } from '@/types';
import type { ProgressSnapshot } from '@/features/progress/snapshot';

/**
 * Conflict resolution, one strategy per entity shape.
 *
 * The reason there is no single strategy: "newest wins" is correct for a
 * planner event and actively wrong for XP. If a student does a quiz on a tablet
 * and another on a phone, last-write-wins silently discards one of them. So each
 * entity gets the weakest rule that is still correct for its semantics:
 *
 *   append-only   quiz attempts, paper results  (client uuid, no conflict possible)
 *   monotonic     xp, streakDays                (max — never regress a counter)
 *   set union     completedChapterIds, badges   (completion is irreversible)
 *   last-write-win planner events, user profile (genuinely mutable intent)
 *
 * All pure functions, so the merge rules are unit-testable without Firestore.
 */

export function mergeProgress(
  local: ProgressSnapshot,
  remote: ProgressSnapshot,
): ProgressSnapshot {
  return {
    // Monotonic: two devices both earning XP must not lose the higher total.
    xp: Math.max(local.xp, remote.xp),
    streakDays: Math.max(local.streakDays, remote.streakDays),

    // The later study date wins — a streak is anchored to the most recent day.
    lastStudyDateIso: laterIso(local.lastStudyDateIso, remote.lastStudyDateIso),

    // Set union: a completed chapter cannot become uncompleted, so union can
    // never lose real progress even if one side is stale.
    completedChapterIds: union(local.completedChapterIds, remote.completedChapterIds),
    unlockedBadgeIds: union(local.unlockedBadgeIds, remote.unlockedBadgeIds),

    updatedAt: laterIso(local.updatedAt, remote.updatedAt) ?? new Date().toISOString(),
  };
}

/**
 * Last-write-wins on `updatedAt`.
 *
 * Ties resolve to `local`: the device the student is holding is the one whose
 * intent they just expressed, so it is the better guess when timestamps match.
 */
export function mergePlannerEvent(
  local: { event: PlannerEvent; updatedAt: string } | null,
  remote: { event: PlannerEvent; updatedAt: string } | null,
): PlannerEvent | null {
  if (!local) return remote?.event ?? null;
  if (!remote) return local.event;
  return remote.updatedAt > local.updatedAt ? remote.event : local.event;
}

/**
 * Append-only merge for event logs.
 *
 * Ids are client-generated UUIDs, so the same attempt can appear on both sides
 * (pushed, then pulled back) without duplicating. De-dup by id, newest first.
 */
export function mergeAppendOnly<T extends { id: string; takenAt: string }>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of [...remote, ...local]) {
    byId.set(item.id, item); // local wins on identical ids
  }
  return [...byId.values()].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

function laterIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
