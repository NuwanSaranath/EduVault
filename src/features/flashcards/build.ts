import type { Question, QuizAttempt, QuizAttemptAnswer } from '@/types';
import type { Flashcard } from '@/components/FlashcardDeck';
import { selectAdaptiveQuestions } from '@/features/quiz/adaptive';

/**
 * Flashcards are derived from the question bank, not authored separately.
 *
 * That is what lets a flashcard session feed the same weakness signal a quiz
 * does: each card *is* a question, so grading it produces a real
 * `QuizAttemptAnswer` against a real question id. A separate deck of cards with
 * no question ids would be a dead end — pleasant to use and invisible to the
 * adaptive algorithm.
 *
 * Card selection runs through `selectAdaptiveQuestions` for the same reason, so
 * the deck is already weighted toward weak and stale topics before the student
 * grades anything.
 */
export function buildDeck(
  pool: Question[],
  attempts: QuizAttempt[],
  count = 12,
): Flashcard[] {
  const selected = selectAdaptiveQuestions(pool, attempts, { count });

  return selected.map((question) => ({
    id: question.id,
    front: question.prompt,
    // The explanation is the point of the reverse side. Showing only the correct
    // option would confirm the answer without teaching the reasoning.
    back: question.explanation
      ? `${question.correctAnswer}\n\n${question.explanation}`
      : question.correctAnswer,
    topicId: question.chapterId,
  }));
}

/** XP per card graded 'known'. Below a quiz answer, because it is self-marked. */
export const XP_PER_KNOWN_CARD = 4;

export interface DeckGrade {
  cardId: string;
  grade: 'known' | 'review';
}

/**
 * Turns a completed deck into a persistable attempt.
 *
 * Recorded as `quizType: 'Flashcards'` so it is never mistaken for a tested
 * score, while still contributing per-topic accuracy — a card the student swiped
 * "review again" is exactly the signal the next quiz should act on.
 */
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
      // Self-report, stored in the same shape a real answer takes so the
      // scoring code does not need a special case.
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
