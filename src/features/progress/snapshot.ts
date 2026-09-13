/**
 * The aggregate progress document and its identity value.
 *
 * Lives here rather than in `db/repositories/progressRepo` on purpose: the merge
 * strategies and their tests need this shape, and importing it from the
 * repository would drag SQLite (and its native deps) into pure logic that has no
 * business touching a database.
 */
export interface ProgressSnapshot {
  xp: number;
  streakDays: number;
  lastStudyDateIso: string | null;
  completedChapterIds: string[];
  unlockedBadgeIds: string[];
  /** ISO stamp of the last local mutation, used for last-write-wins fields. */
  updatedAt: string;
}

/**
 * Identity element for `mergeProgress`: merging anything with this returns the
 * other side unchanged. That is what lets the push transaction treat "no remote
 * document yet" and "an empty remote document" as the same case.
 */
export const EMPTY_SNAPSHOT: ProgressSnapshot = {
  xp: 0,
  streakDays: 0,
  lastStudyDateIso: null,
  completedChapterIds: [],
  unlockedBadgeIds: [],
  updatedAt: new Date(0).toISOString(),
};
