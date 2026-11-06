import type { Question, QuizAttempt, QuizAttemptAnswer } from '@/types';
import type { Flashcard } from '@/components/FlashcardDeck';
import { selectAdaptiveQuestions } from '@/features/quiz/adaptive';

// flashcards are made from the question bank, not written separately.
// that way grading a card counts as a real answer for that question and feeds
// the adaptive quiz. cards are picked with selectAdaptiveQuestions too
export function buildDeck(
  pool: Question[],
  attempts: QuizAttempt[],
  count = 12,
): Flashcard[] {
  const selected = selectAdaptiveQuestions(pool, attempts, { count });

  return selected.map((question) => ({
    id: question.id,
    front: question.prompt,
    // show the explanation on the back, not just the answer
    back: question.explanation
      ? `${question.correctAnswer}\n\n${question.explanation}`
      : question.correctAnswer,
    topicId: question.chapterId,
  }));
}

// xp per 'known' card, less than a quiz answer since it's self marked
export const XP_PER_KNOWN_CARD = 4;

export interface DeckGrade {
  cardId: string;
  grade: 'known' | 'review';
}

// turn a finished deck into an attempt. quizType 'Flashcards' so it isn't
// counted as a test score, but 'review again' cards still lower accuracy
export function gradesToAttempt(
  grades: DeckGrade[],
  pool: Question[],
  durationSeconds: number,
): QuizAttempt | null {
  if (grades.length === 0) return null;

  const byId = new Map(pool.map((q) => [q.id, q]));

  const answers: QuizAttemptAnswer[] = grades.map((grade) => {
    const question = byId.get(grade.cardId);
    const known = grade.grade === 'known';
    return {
      questionId: grade.cardId,
      // same shape as a real answer so scoring needs no special case
      givenAnswer: known ? (question?.correctAnswer ?? 'known') : 'review',
      correct: known,
    };
  });

  const knownCount = answers.filter((a) => a.correct).length;
  const subjectId = byId.get(grades[0].cardId)?.subjectId ?? 'mixed';

  return {
    id: `flash-${Date.now()}`,
    subjectId,
    quizType: 'Flashcards',
    answers,
    score: knownCount,
    totalQuestions: answers.length,
    xpEarned: knownCount * XP_PER_KNOWN_CARD,
    takenAt: new Date().toISOString(),
    durationSeconds,
  };
}
