import type { PlannerEvent } from '@/types';
import type { ProgressSnapshot } from '@/features/progress/snapshot';

// Conflict rules. Different data needs a different rule, e.g. "newest wins"
// is fine for a planner event but would lose XP earned on another device.
//
//   quiz attempts, paper results -> append only (ids made on the phone)
//   xp, streakDays               -> max
//   completed chapters, badges   -> union
//   planner events               -> last write wins
//
// All pure functions so they can be tested without firestore.

export function mergeProgress(
  local: ProgressSnapshot,
  remote: ProgressSnapshot,
): ProgressSnapshot {
  return {
    // take the higher one so xp from two devices isn't lost
    xp: Math.max(local.xp, remote.xp),
    streakDays: Math.max(local.streakDays, remote.streakDays),

    // latest study day wins, streak counts from the most recent day
    lastStudyDateIso: laterIso(local.lastStudyDateIso, remote.lastStudyDateIso),

    // union, a finished chapter never becomes unfinished
    completedChapterIds: union(local.completedChapterIds, remote.completedChapterIds),
    unlockedBadgeIds: union(local.unlockedBadgeIds, remote.unlockedBadgeIds),

    updatedAt: laterIso(local.updatedAt, remote.updatedAt) ?? new Date().toISOString(),
  };
}

// last write wins on updatedAt. on a tie keep local, it's the device
// the student is using
export function mergePlannerEvent(
  local: { event: PlannerEvent; updatedAt: string } | null,
  remote: { event: PlannerEvent; updatedAt: string } | null,
): PlannerEvent | null {
  if (!local) return remote?.event ?? null;
  if (!remote) return local.event;
  return remote.updatedAt > local.updatedAt ? remote.event : local.event;
}

// for logs like attempts. same id can be on both sides after a push so
// dedupe by id, newest first
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
