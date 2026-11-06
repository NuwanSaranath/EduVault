import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { LeaderboardEntry, Question, QuestionType } from '@/types';
import { getAllQuestions, getQuestionsBySubject } from '@/db/repositories/contentRepo';
import { getRecentAttempts } from '@/db/repositories/attemptRepo';
import { selectAdaptiveQuestions, shuffle } from '@/features/quiz/adaptive';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';

// quiz questions come from sqlite and the adaptive algorithm picks them,
// so it's personalised without needing the server
export async function fetchQuizQuestions(
  subjectId: string,
  type: QuestionType | 'Mixed' = 'Mixed',
  count = 10,
): Promise<Question[]> {
  const pool = (await getQuestionsBySubject(subjectId)).filter(
    (q) => type === 'Mixed' || q.type === type,
  );

  // use attempts from all subjects, a chapter's accuracy is the same anywhere
  const attempts = await getRecentAttempts();

  return selectAdaptiveQuestions(pool, attempts, { count });
}

// daily challenge is random on purpose, not adaptive. it's for variety,
// drilling weak topics every day would feel like a punishment
export async function fetchDailyChallenge(): Promise<Question[]> {
  const all = await getAllQuestions();
  return shuffle(all).slice(0, 5);
}

// leaderboard, the only thing that needs to be online. it's comparing with
// other users so caching it doesn't make sense. empty array = show
// "available when online"
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
    // offline or no collection yet, just return empty
    return [];
  }
}
