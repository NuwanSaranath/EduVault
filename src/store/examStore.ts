import { create } from 'zustand';
import type { PastPaperResult } from '@/types';

/**
 * The answer sheet as submitted, in the letter-based form `AnswerSheetGrid`
 * speaks.
 *
 * Kept alongside the result so the result screen can replay the same sheet in
 * review mode. Rebuilding it there would mean re-reading the questions and
 * re-deriving the letter mapping — two chances for the review to disagree with
 * what the student actually saw while sitting the paper.
 */
export interface SubmittedSheet {
  questionCount: number;
  optionsPerQuestion: number;
  /** 1-based question number → chosen option letter. */
  answers: Record<number, string>;
  /** 1-based question number → correct option letter. */
  correctAnswers: Record<number, string>;
}

interface ExamState {
  lastResult: PastPaperResult | null;
  lastSheet: SubmittedSheet | null;
  setLastResult: (result: PastPaperResult) => void;
  setLastSheet: (sheet: SubmittedSheet) => void;
  clear: () => void;
}

/**
 * Deliberately in-memory and unpersisted: this is handover state between the
 * exam screen and the result screen, not a record. The durable copy is the
 * `PastPaperResult` written to SQLite by `progressStore`.
 */
export const useExamStore = create<ExamState>()((set) => ({
  lastResult: null,
  lastSheet: null,
  setLastResult: (result) => set({ lastResult: result }),
  setLastSheet: (sheet) => set({ lastSheet: sheet }),
  clear: () => set({ lastResult: null, lastSheet: null }),
}));
