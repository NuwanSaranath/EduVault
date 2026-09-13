import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { LeaderboardEntry, Question, QuestionType } from '@/types';
import { getAllQuestions, getQuestionsBySubject } from '@/db/repositories/contentRepo';
import { getRecentAttempts } from '@/db/repositories/attemptRepo';
import { selectAdaptiveQuestions, shuffle } from '@/features/quiz/adaptive';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';

/**
 * Quiz question sourcing.
 *
 * The pool comes from SQLite and the *selection* comes from the adaptive
 * algorithm, which means a student's session is tailored using only data already
 * on the device. That is the point: personalisation that needs no round trip
 * works identically offline, which a server-side recommender never would.
 */
export async function fetchQuizQuestions(
  subjectId: string,
  type: QuestionType | 'Mixed' = 'Mixed',
  count = 10,
): Promise<Question[]> {
  const pool = (await getQuestionsBySubject(subjectId)).filter(
    (q) => type === 'Mixed' || q.type === type,
  );

  // Attempt history is read across all subjects, not just this one: a chapter's
  // accuracy is the same fact regardless of which session it was measured in.
  const attempts = await getRecentAttempts();

  return selectAdaptiveQuestions(pool, attempts, { count });
}

/**
 * The daily challenge stays deliberately random rather than adaptive.
 *
 * Its job is variety and streak-keeping, so the same weak-topic bias that helps
 * a practice session would make the daily feel like punishment for a bad week.
 */
export async function fetchDailyChallenge(): Promise<Question[]> {
  const all = await getAllQuestions();
  return shuffle(all).slice(0, 5);
}

/**
 * Leaderboard: the one genuinely online-only read in the app.
 *
 * It is inherently a comparison against other users, so there is nothing
 * meaningful to cache — a stale leaderboard is worse than an honest empty state.
 * Callers render an "available when online" message on an empty array.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const snapshot = await getDocs(
      query(collection(getFirestoreDb(), 'leaderboard'), orderBy('xp', 'desc'), limit(20)),
    );

    return snapshot.docs.map((docSnap, index) => ({
      userId: docSnap.id,
      ...(docSnap.data() as Omit<LeaderboardEntry, 'userId' | 'rank'>),
      rank: index + 1,
    }));
  } catch {
    // Offline, or the collection does not exist yet. An empty list is the
    // correct answer here, not an exception the UI has to handle.
    return [];
  }
}
