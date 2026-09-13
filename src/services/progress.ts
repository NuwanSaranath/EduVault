import type { QuizAttempt, SubjectProgress } from '@/types';
import { getChaptersBySubject, getAllQuestions } from '@/db/repositories/contentRepo';
import { getAttempts, getRecentAttempts } from '@/db/repositories/attemptRepo';
import { weakestTopics } from '@/features/quiz/adaptive';
import { getDb } from '@/db';

/**
 * Progress computation.
 *
 * Everything here is derived from data already on the device — attempts in
 * SQLite and chapter metadata from the content cache — so the Progress screen is
 * fully functional offline. Nothing is fetched; the only thing sync changes is
 * whether other devices' attempts have arrived yet.
 */
export function computeSubjectProgress(
  subjectId: string,
  quizAttempts: QuizAttempt[],
  pastPaperCompletionPercent: number,
  chapterStats: { completedLessons: number; totalLessons: number },
): SubjectProgress {
  const theoryPercent =
    chapterStats.totalLessons === 0
      ? 0
      : (chapterStats.completedLessons / chapterStats.totalLessons) * 100;

  const subjectAttempts = quizAttempts.filter((a) => a.subjectId === subjectId);
  const quizAvgScore =
    subjectAttempts.length === 0
      ? 0
      : (subjectAttempts.reduce((sum, a) => sum + a.score / Math.max(1, a.totalQuestions), 0) /
          subjectAttempts.length) *
        100;

  return {
    subjectId,
    theoryPercent: Math.round(theoryPercent),
    pastPaperPercent: Math.round(pastPaperCompletionPercent),
    quizAvgScore: Math.round(quizAvgScore),
  };
}

/** Lesson totals for one subject, read from the cached chapter rows. */
export async function fetchSubjectChapterStats(
  subjectId: string,
): Promise<{ completedLessons: number; totalLessons: number }> {
  const chapters = await getChaptersBySubject(subjectId);
  return {
    completedLessons: chapters.reduce((sum, c) => sum + c.completedLessons, 0),
    totalLessons: chapters.reduce((sum, c) => sum + c.totalLessons, 0),
  };
}

export async function fetchOverallChapterStats(): Promise<{ completed: number; total: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM chapters');
  let completed = 0;
  let total = 0;
  for (const row of rows) {
    const chapter = JSON.parse(row.payload) as { completedLessons: number; totalLessons: number };
    completed += chapter.completedLessons;
    total += chapter.totalLessons;
  }
  return { completed, total };
}

export async function fetchAttempts(subjectId?: string): Promise<QuizAttempt[]> {
  return getAttempts(subjectId);
}

/**
 * The chapters a student is weakest in, shared with the quiz selector.
 *
 * Deliberately the same `weakestTopics` the adaptive algorithm uses rather than a
 * second calculation: if the Progress screen named different weak areas than the
 * ones the quiz drills, one of them would be lying.
 */
export async function fetchWeakestChapters(
  limit = 3,
): Promise<Array<{ topicId: string; accuracy: number; seen: number }>> {
  const [attempts, pool] = await Promise.all([getRecentAttempts(), getAllQuestions()]);
  return weakestTopics(attempts, pool, limit);
}
