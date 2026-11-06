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

// a picture to show when teaching a concept
export interface ImageSuggestion {
  // what it shows
  image: string;
  // concept it explains
  usedToExplain: string;
  // why it helps
  reason: string;
}

// video as a search phrase so it doesn't break like links do
export interface VideoSuggestion {
  // youtube search words
  search: string;
  // what to look for
  observe: string;
  // what they should get from it
  learn: string;
}

export type PracticeKind = 'MCQ' | 'Structured' | 'Past Paper';

export interface PracticeItem {
  kind: PracticeKind;
  question: string;
  // mcq choices, not there for structured/essay
  options?: string[];
  answer: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  // section number from the resource book, e.g. "1.1"
  sectionNumber?: string;
  // sub topics, e.g. "1.1.1 කැතෝඩ කිරණවල ගුණ"
  subtopics?: string[];
  notes: string;
  importantPoints: string[];
  formulaSheet: string[];
  summary: string;
  relatedQuestionIds: string[];
  audioUrl?: string;
  completed?: boolean;
  // optional teaching content. full lessons fill these, simple ones don't and
  // the reader hides those tabs
  // short intro to start the lesson
  intro?: string;
  // why it matters (exam marks etc.)
  whyImportant?: string;
  realLifeExamples?: string[];
  imageSuggestions?: ImageSuggestion[];
  videoSuggestions?: VideoSuggestion[];
  memoryTricks?: string[];
  commonMistakes?: string[];
  examTips?: string[];
  practiceItems?: PracticeItem[];
  // animation ids for this lesson (see features/animation/registry). ids not
  // imports, so a lesson from firestore can use them too. unknown ids are skipped
  animationIds?: string[];
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
  // 'Flashcards' is separate because it's self marked, it counts for weak
  // topics but shouldn't show as an exam score
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
