import { create } from 'zustand';
import type { PastPaperResult, QuizAttempt } from '@/types';
import { evaluateUnlockedBadgeIds } from '@/features/gamification/badges';
import type { ProgressSnapshot } from '@/features/progress/snapshot';
import {
  getAttempts,
  getPaperResults,
  saveAttempt,
  savePaperResult,
} from '@/db/repositories/attemptRepo';
import { readSnapshot, writeSnapshot } from '@/db/repositories/progressRepo';

/**
 * Progress state.
 *
 * No `persist` middleware here, unlike the other stores. This state is backed by
 * SQLite, and layering AsyncStorage on top would give two copies of the same
 * facts with no rule for which wins after a sync. The store is hydrated once at
 * boot by `hydrateProgressFromDb` and every mutation writes through to the
 * database, which also enqueues the outbox row.
 *
 * Mutations are optimistic: state updates synchronously and the write is fired
 * without awaiting. A student finishing a quiz sees their XP immediately whether
 * they are online, offline, or mid-handover between cells.
 */
interface ProgressState {
  xp: number;
  streakDays: number;
  lastStudyDateIso: string | null;
  quizAttempts: QuizAttempt[];
  pastPaperResults: PastPaperResult[];
  completedChapterIds: string[];
  unlockedBadgeIds: string[];
  todayGoalTarget: number;
  todayCompletedCount: number;
  hasHydrated: boolean;
  addQuizAttempt: (attempt: QuizAttempt) => void;
  addPastPaperResult: (result: PastPaperResult) => void;
  markChapterCompleted: (chapterId: string) => void;
  touchStudySession: () => void;
  hydrate: (payload: {
    snapshot: ProgressSnapshot;
    attempts: QuizAttempt[];
    results: PastPaperResult[];
  }) => void;
}

function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function isYesterday(previousIso: string, todayIso: string): boolean {
  const previous = new Date(previousIso);
  const yesterday = new Date(todayIso);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(previous.toISOString(), yesterday.toISOString());
}

/** Questions answered today, derived rather than stored so it cannot drift. */
function countAnsweredToday(attempts: QuizAttempt[], todayIso: string): number {
  return attempts
    .filter((a) => isSameDay(a.takenAt, todayIso))
    .reduce((sum, a) => sum + a.totalQuestions, 0);
}

export const useProgressStore = create<ProgressState>()((set, get) => ({
  xp: 0,
  streakDays: 0,
  lastStudyDateIso: null,
  quizAttempts: [],
  pastPaperResults: [],
  completedChapterIds: [],
  unlockedBadgeIds: [],
  todayGoalTarget: 20,
  todayCompletedCount: 0,
  hasHydrated: false,

  hydrate: ({ snapshot, attempts, results }) =>
    set({
      xp: snapshot.xp,
      streakDays: snapshot.streakDays,
      lastStudyDateIso: snapshot.lastStudyDateIso,
      completedChapterIds: snapshot.completedChapterIds,
      unlockedBadgeIds: snapshot.unlockedBadgeIds,
      quizAttempts: attempts,
      pastPaperResults: results,
      todayCompletedCount: countAnsweredToday(attempts, new Date().toISOString()),
      hasHydrated: true,
    }),

  addQuizAttempt: (attempt) => {
    const quizAttempts = [attempt, ...get().quizAttempts];
    const state = get();

    const unlockedBadgeIds = [
      ...new Set([
        ...state.unlockedBadgeIds,
        ...evaluateUnlockedBadgeIds({
          quizAttempts,
          streakDays: state.streakDays,
          completedChapterIds: state.completedChapterIds,
        }),
      ]),
    ];

    set({
      quizAttempts,
      xp: state.xp + attempt.xpEarned,
      todayCompletedCount: state.todayCompletedCount + attempt.totalQuestions,
      unlockedBadgeIds,
    });

    get().touchStudySession();

    // Fire-and-forget: the local row and its outbox entry are written in one
    // transaction, so a failure here cannot leave a half-saved attempt. Awaiting
    // would block the result screen on disk I/O for no user benefit.
    void saveAttempt(attempt);
    void persistSnapshot();
  },

  addPastPaperResult: (result) => {
    set((state) => ({ pastPaperResults: [result, ...state.pastPaperResults] }));
    get().touchStudySession();
    void savePaperResult(result);
    void persistSnapshot();
  },

  markChapterCompleted: (chapterId) => {
    set((state) => ({
      completedChapterIds: [...new Set([...state.completedChapterIds, chapterId])],
    }));
    get().touchStudySession();
    void persistSnapshot();
  },

  touchStudySession: () => {
    const now = new Date().toISOString();
    set((state) => {
      if (state.lastStudyDateIso && isSameDay(state.lastStudyDateIso, now)) {
        return { lastStudyDateIso: now };
      }
      const continuesStreak =
        state.lastStudyDateIso !== null && isYesterday(state.lastStudyDateIso, now);
      return {
        lastStudyDateIso: now,
        // Any gap longer than a day restarts the streak at 1, not 0 — today
        // still counts as a study day.
        streakDays: continuesStreak ? state.streakDays + 1 : 1,
      };
    });
    void persistSnapshot();
  },
}));

/**
 * Writes the current counters to SQLite and queues them for sync.
 *
 * Reads straight from the store rather than taking a parameter so callers cannot
 * accidentally persist a stale snapshot assembled before their own `set`.
 */
async function persistSnapshot(): Promise<void> {
  const state = useProgressStore.getState();
  await writeSnapshot({
    xp: state.xp,
    streakDays: state.streakDays,
    lastStudyDateIso: state.lastStudyDateIso,
    completedChapterIds: state.completedChapterIds,
    unlockedBadgeIds: state.unlockedBadgeIds,
    updatedAt: new Date().toISOString(),
  });
}

/** Called once from `useAppBootstrap`, before the sync engine starts. */
export async function hydrateProgressFromDb(): Promise<void> {
  const [snapshot, attempts, results] = await Promise.all([
    readSnapshot(),
    getAttempts(),
    getPaperResults(),
  ]);
  useProgressStore.getState().hydrate({ snapshot, attempts, results });
}
