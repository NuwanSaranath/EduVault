import type { Chapter, QuizAttempt, SubjectProgress } from '@/types';
import { getChaptersBySubject, getAllQuestions } from '@/db/repositories/contentRepo';
import { getAttempts, getRecentAttempts } from '@/db/repositories/attemptRepo';
import { weakestTopics } from '@/features/quiz/adaptive';
import { getDb } from '@/db';

// progress numbers, all worked out from data on the phone (attempts in
// sqlite + chapters in the cache). so the progress screen works offline
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

// chapters for a subject. these don't have completion, combine with
// chapterLessonTotals and the store's completed ids
export async function fetchSubjectChapters(subjectId: string): Promise<Chapter[]> {
  return getChaptersBySubject(subjectId);
}

// all chapters, every subject
export async function fetchAllChapters(): Promise<Chapter[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM chapters');
  return rows.map((row) => JSON.parse(row.payload) as Chapter);
}

export async function fetchAttempts(subjectId?: string): Promise<QuizAttempt[]> {
  return getAttempts(subjectId);
}

// weakest chapters. uses the same weakestTopics as the adaptive quiz so both
// screens show the same weak areas
export async function fetchWeakestChapters(
  limit = 3,
): Promise<Array<{ topicId: string; accuracy: number; seen: number }>> {
  const [attempts, pool] = await Promise.all([getRecentAttempts(), getAllQuestions()]);
  return weakestTopics(attempts, pool, limit);
}
