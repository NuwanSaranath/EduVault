import { create } from 'zustand';
import type { PastPaperResult } from '@/types';

// the answer sheet as submitted (letters, like AnswerSheetGrid uses).
// kept so the result screen can show the exact same sheet in review mode
export interface SubmittedSheet {
  questionCount: number;
  optionsPerQuestion: number;
  // question number (from 1) -> chosen letter
  answers: Record<number, string>;
  // question number (from 1) -> correct letter
  correctAnswers: Record<number, string>;
}

interface ExamState {
  lastResult: PastPaperResult | null;
  lastSheet: SubmittedSheet | null;
  setLastResult: (result: PastPaperResult) => void;
  setLastSheet: (sheet: SubmittedSheet) => void;
  clear: () => void;
}

// only in memory, just passes data from the exam screen to the result
// screen. the saved copy is the PastPaperResult in sqlite
export const useExamStore = create<ExamState>()((set) => ({
  lastResult: null,
  lastSheet: null,
  setLastResult: (result) => set({ lastResult: result }),
  setLastSheet: (sheet) => set({ lastSheet: sheet }),
  clear: () => set({ lastResult: null, lastSheet: null }),
}));
