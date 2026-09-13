import type { Stream } from '@/constants/theme';

export type { Stream };

export interface User {
  id: string;
  name: string;
  email: string;
  school: string;
  district: string;
  alYear: string;
  stream: Stream;
  avatarUrl?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  streams: Stream[];
  totalChapters: number;
}

/** A diagram/photo a teacher should put on the board for a concept. */
export interface ImageSuggestion {
  /** What the picture shows. */
  image: string;
  /** The concept it is used to explain. */
  usedToExplain: string;
  /** Why this picture makes the concept click. */
  reason: string;
}

/** A video to watch, expressed as a search phrase so it survives dead links. */
export interface VideoSuggestion {
  /** YouTube search keywords. */
  search: string;
  /** What the student should watch for. */
  observe: string;
  /** The takeaway. */
  learn: string;
}

export type PracticeKind = 'MCQ' | 'Structured' | 'Past Paper';

export interface PracticeItem {
  kind: PracticeKind;
  question: string;
  /** MCQ choices; omitted for structured/essay style items. */
  options?: string[];
  answer: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  /** Syllabus section number as printed in the resource book, e.g. "1.1". */
  sectionNumber?: string;
  /** Numbered sub-topics under this section, e.g. "1.1.1 කැතෝඩ කිරණවල ගුණ". */
  subtopics?: string[];
  notes: string;
  importantPoints: string[];
  formulaSheet: string[];
  summary: string;
  relatedQuestionIds: string[];
  audioUrl?: string;
  completed?: boolean;
  // ---- Optional guided-teaching content. Lessons written in the full
  // teaching format populate these; simpler lessons leave them undefined and
  // the reader hides the corresponding tabs.
  /** Short conversational hook that opens the lesson. */
  intro?: string;
  /** Why the topic matters (exam weight, what it unlocks). */
  whyImportant?: string;
  realLifeExamples?: string[];
  imageSuggestions?: ImageSuggestion[];
  videoSuggestions?: VideoSuggestion[];
  memoryTricks?: string[];
  commonMistakes?: string[];
  examTips?: string[];
  practiceItems?: PracticeItem[];
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  lessonIds: string[];
  pdfUrl: string;
  completedLessons: number;
  totalLessons: number;
}

export type PaperType = 'MCQ' | 'Structured' | 'Essay' | 'Marking Scheme';

export interface PastPaperDocument {
  type: PaperType;
  url: string;
}

export interface PastPaper {
  id: string;
  subjectId: string;
  year: number;
  title: string;
  documents: PastPaperDocument[];
  questionIds: string[];
  durationMinutes: number;
}

export type QuestionType = 'MCQ' | 'True/False' | 'Short Answer';

export interface Question {
  id: string;
  subjectId: string;
  chapterId?: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface QuizAttemptAnswer {
  questionId: string;
  givenAnswer: string;
  correct: boolean;
}

export interface QuizAttempt {
  id: string;
  subjectId: string;
  /**
   * How the questions were answered. 'Flashcards' is kept distinct from the
   * quiz types because a flashcard grade is self-reported rather than tested —
   * it is a valid weakness signal, but it should never be presented as an exam
   * score.
   */
  quizType: QuestionType | 'Mixed' | 'Flashcards';
  answers: QuizAttemptAnswer[];
  score: number;
  totalQuestions: number;
  xpEarned: number;
  takenAt: string;
  durationSeconds: number;
}

export interface PastPaperResult {
  id: string;
  pastPaperId: string;
  score: number;
  totalMarks: number;
  weakAreas: string[];
  takenAt: string;
  durationSeconds: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  xp: number;
  rank: number;
}

export interface PlannerEvent {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  time: string;
  subjectId: string;
  activity: string;
  reminderEnabled: boolean;
}

export interface SubjectProgress {
  subjectId: string;
  theoryPercent: number;
  pastPaperPercent: number;
  quizAvgScore: number;
}

export interface AiTutorMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sinhalaText?: string;
  examples?: string[];
  relatedQuestionIds?: string[];
  createdAt: string;
}
