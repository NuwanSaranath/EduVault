import { create } from 'zustand';
import type { Question, QuestionType } from '@/types';

interface QuizSessionState {
  subjectId: string | null;
  quizType: QuestionType | 'Mixed';
  isDailyChallenge: boolean;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  startedAt: string | null;
  lastResult: {
    correctCount: number;
    totalQuestions: number;
    xpEarned: number;
    durationSeconds: number;
  } | null;
  startSession: (params: {
    subjectId: string;
    quizType: QuestionType | 'Mixed';
    questions: Question[];
    isDailyChallenge?: boolean;
  }) => void;
  answerCurrent: (answer: string) => void;
  nextQuestion: () => void;
  finishSession: (result: QuizSessionState['lastResult']) => void;
  resetSession: () => void;
}

export const useQuizStore = create<QuizSessionState>()((set) => ({
  subjectId: null,
  quizType: 'Mixed',
  isDailyChallenge: false,
  questions: [],
  currentIndex: 0,
  answers: {},
  startedAt: null,
  lastResult: null,
  startSession: ({ subjectId, quizType, questions, isDailyChallenge = false }) =>
    set({
      subjectId,
      quizType,
      questions,
      isDailyChallenge,
      currentIndex: 0,
      answers: {},
      startedAt: new Date().toISOString(),
      lastResult: null,
    }),
  answerCurrent: (answer) =>
    set((state) => {
      const question = state.questions[state.currentIndex];
      if (!question) return state;
      return { answers: { ...state.answers, [question.id]: answer } };
    }),
  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),
  finishSession: (result) => set({ lastResult: result }),
  resetSession: () =>
    set({
      subjectId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      startedAt: null,
      lastResult: null,
      isDailyChallenge: false,
    }),
}));
