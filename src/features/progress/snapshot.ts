// progress object type. it's here and not in progressRepo so the merge code
// and its tests don't need to import sqlite
export interface ProgressSnapshot {
  xp: number;
  streakDays: number;
  lastStudyDateIso: string | null;
  completedChapterIds: string[];
  unlockedBadgeIds: string[];
  // time of the last local change
  updatedAt: string;
}

// empty progress. merging with this gives back the other side, so "no
// server doc yet" works the same as an empty one
export const EMPTY_SNAPSHOT: ProgressSnapshot = {
  xp: 0,
  streakDays: 0,
  lastStudyDateIso: null,
  completedChapterIds: [],
  unlockedBadgeIds: [],
  updatedAt: new Date(0).toISOString(),
};
