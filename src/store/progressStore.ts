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

// Progress (xp, streak, badges...).
// No persist here, it's stored in sqlite. Using AsyncStorage too would give
// two copies and no way to know which is right after a sync.
// Loaded once at startup by hydrateProgressFromDb, every change writes to the
// db (which also adds an outbox row).
// State updates right away and the save isn't awaited, so xp shows instantly
// even offline.
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

// worked out from attempts instead of stored, so it can't get out of sync
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

    // not awaited. row + outbox are one transaction so it can't half save,
    // and no need to make the result screen wait
    void saveAttempt(attempt);
  },

  addPastPaperResult: (result) => {
    set((state) => ({ pastPaperResults: [result, ...state.pastPaperResults] }));
    get().touchStudySession();
    void savePaperResult(result);
  },

  markChapterCompleted: (chapterId) => {
    set((state) => ({
      completedChapterIds: [...new Set([...state.completedChapterIds, chapterId])],
    }));
    get().touchStudySession();
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
        // missed a day -> back to 1 (today still counts)
        streakDays: continuesStreak ? state.streakDays + 1 : 1,
      };
    });
    void persistSnapshot();
  },
}));

// save current counters to sqlite and queue sync. reads from the store
// directly so nobody passes in an old copy
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

// called once from useAppBootstrap before sync starts
export async function hydrateProgressFromDb(): Promise<void> {
  const [snapshot, attempts, results] = await Promise.all([
    readSnapshot(),
    getAttempts(),
    getPaperResults(),
  ]);
  useProgressStore.getState().hydrate({ snapshot, attempts, results });
}
