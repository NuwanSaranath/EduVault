import type { Question, QuizAttemptAnswer } from '@/types';

export function shuffleQuestions<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isAnswerCorrect(question: Question, givenAnswer: string): boolean {
  return question.correctAnswer.trim().toLowerCase() === givenAnswer.trim().toLowerCase();
}

export function scoreAnswers(
  questions: Question[],
  answers: Record<string, string>,
): { attemptAnswers: QuizAttemptAnswer[]; correctCount: number } {
  const attemptAnswers: QuizAttemptAnswer[] = questions.map((question) => {
    const givenAnswer = answers[question.id] ?? '';
    return {
      questionId: question.id,
      givenAnswer,
      correct: isAnswerCorrect(question, givenAnswer),
    };
  });

  const correctCount = attemptAnswers.filter((a) => a.correct).length;
  return { attemptAnswers, correctCount };
}
