// Architecture stub for the future admin panel/backend. No UI consumes this
// yet — it documents the contract a backend team can implement against.
import type { PaperType } from '@/types';

export interface UploadTheoryPdfPayload {
  subjectId: string;
  chapterId: string;
  file: { uri: string; name: string };
}

export interface UploadPastPaperPayload {
  subjectId: string;
  year: number;
  documentType: PaperType;
  file: { uri: string; name: string };
}

export interface CreateQuizPayload {
  subjectId: string;
  chapterId?: string;
  questions: {
    type: 'MCQ' | 'True/False' | 'Short Answer';
    prompt: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export interface StudentAnalyticsSummary {
  totalStudents: number;
  averageXp: number;
  mostAttemptedSubjectId: string;
  weakestSubjectId: string;
}

export interface AdminApi {
  uploadTheoryPdf(payload: UploadTheoryPdfPayload): Promise<{ id: string }>;
  uploadPastPaper(payload: UploadPastPaperPayload): Promise<{ id: string }>;
  createQuiz(payload: CreateQuizPayload): Promise<{ id: string }>;
  manageSubjects(): Promise<void>;
  getStudentAnalytics(): Promise<StudentAnalyticsSummary>;
}
