import type { Chapter, Lesson } from '@/types';
import { atomicStructureLessons } from './lessons/chemistryAtomicStructure';

export const SAMPLE_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
export const SAMPLE_AUDIO_URL = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';

interface ChapterSeed {
  subjectId: string;
  titles: string[];
  completed: number;
}

const seeds: ChapterSeed[] = [
  { subjectId: 'physics', titles: ['Mechanics', 'Properties of Matter', 'Thermal Physics', 'Electricity & Magnetism', 'Modern Physics', 'Wave Motion'], completed: 4 },
  { subjectId: 'combined-maths', titles: ['Algebra', 'Trigonometry', 'Coordinate Geometry', 'Vectors', 'Differentiation', 'Integration', 'Statistics', 'Mechanics (Statics)'], completed: 5 },
  { subjectId: 'chemistry', titles: ['Atomic Structure', 'Chemical Bonding', 'Periodic Table', 'Organic Chemistry', 'Electrochemistry', 'Thermochemistry'], completed: 3 },
  { subjectId: 'biology', titles: ['Cell Biology', 'Genetics', 'Biochemistry & Enzymes', 'Plant Physiology', 'Ecology'], completed: 3 },
  { subjectId: 'ict', titles: ['Introduction to ICT', 'Data Representation', 'Computer Systems', 'Programming Concepts', 'Database Systems', 'Networking'], completed: 4 },
  { subjectId: 'business-studies', titles: ['Introduction to Business', 'Business Environment', 'Marketing', 'Human Resource Management', 'Entrepreneurship'], completed: 2 },
  { subjectId: 'accounting', titles: ['Accounting Equation & Principles', 'Ledger & Trial Balance', 'Financial Statements', 'Depreciation & Fixed Assets', 'Partnership Accounts'], completed: 2 },
  { subjectId: 'economics', titles: ['Basic Concepts', 'Demand & Supply', 'Market Structures', 'National Income', 'Money & Banking'], completed: 3 },
  { subjectId: 'general-english', titles: ['Reading Comprehension', 'Grammar Essentials', 'Essay Writing', 'Listening & Speaking'], completed: 1 },
];

const lightNotes: Record<string, { notes: string; points: string[]; summary: string }> = {
  default: {
    notes: 'This chapter introduces the core concepts you need for the A/L syllabus, with examples aligned to past paper trends.',
    points: ['Understand key definitions', 'Practice past paper questions', 'Revise before moving to the next chapter'],
    summary: 'A foundational chapter — revisit important points before attempting related quizzes.',
  },
};

export const chapters: Chapter[] = [];
export const lessons: Lesson[] = [];

// Chapters with real, fully-written lessons (rather than the single generic
// "Overview" lesson) — keyed by chapter id, valued by how many lessons they have.
const flagshipLessonCounts: Record<string, number> = {
  'physics-ch1': 3,
  'chemistry-ch1': 7,
};

for (const seed of seeds) {
  seed.titles.forEach((title, index) => {
    const chapterId = `${seed.subjectId}-ch${index + 1}`;
    const lessonCount = flagshipLessonCounts[chapterId] ?? 1;
    const lessonIds: string[] = [];

    for (let l = 0; l < lessonCount; l += 1) {
      const lessonId = `${chapterId}-l${l + 1}`;
      lessonIds.push(lessonId);
    }

    chapters.push({
      id: chapterId,
      subjectId: seed.subjectId,
      title,
      order: index + 1,
      lessonIds,
      pdfUrl: SAMPLE_PDF_URL,
      completedLessons: index < seed.completed ? lessonCount : 0,
      totalLessons: lessonCount,
    });
  });
}

// Flagship, fully fleshed content: Physics > Mechanics
lessons.push(
  {
    id: 'physics-ch1-l1',
    chapterId: 'physics-ch1',
    title: 'Kinematics',
    notes:
      'Kinematics describes motion without considering its causes. Displacement, velocity and acceleration are vector quantities that fully describe how a body moves through space over time. For uniformly accelerated motion, the equations of motion (suvat equations) let us relate initial velocity, final velocity, acceleration, displacement, and time.',
    importantPoints: [
      'Displacement is a vector; distance is a scalar',
      'Velocity is the rate of change of displacement',
      'Acceleration is the rate of change of velocity',
      'Area under a velocity-time graph gives displacement',
    ],
    formulaSheet: ['v = u + at', 's = ut + ½at²', 'v² = u² + 2as', 's = ½(u + v)t'],
    summary: 'Kinematics equations connect u, v, a, s and t for uniformly accelerated motion — memorise all four suvat equations.',
    relatedQuestionIds: ['q-physics-1'],
    audioUrl: SAMPLE_AUDIO_URL,
    completed: true,
  },
  {
    id: 'physics-ch1-l2',
    chapterId: 'physics-ch1',
    title: "Newton's Laws of Motion",
    notes:
      "Newton's three laws form the foundation of classical mechanics. The First Law (inertia) states a body remains at rest or in uniform motion unless acted on by a net external force. The Second Law quantifies force as the product of mass and acceleration. The Third Law states every action has an equal and opposite reaction.",
    importantPoints: [
      'First Law: inertia — no net force means no change in motion',
      'Second Law: F = ma — force causes acceleration proportional to mass',
      'Third Law: action-reaction pairs act on different bodies',
      'Net force is the vector sum of all forces acting on a body',
    ],
    formulaSheet: ['F = ma', 'p = mv', 'Impulse = FΔt = Δp'],
    summary: "Newton's laws relate force, mass and acceleration, and explain why objects interact the way they do.",
    relatedQuestionIds: ['q-physics-2'],
    completed: true,
  },
  {
    id: 'physics-ch1-l3',
    chapterId: 'physics-ch1',
    title: 'Work, Energy and Power',
    notes:
      'Work is done when a force causes displacement in the direction of the force. Energy is the capacity to do work, and the work-energy theorem links the two. Power measures the rate at which work is done or energy is transferred.',
    importantPoints: [
      'Work = Force × Displacement × cos(θ)',
      'Kinetic energy depends on mass and the square of speed',
      'Gravitational potential energy depends on height',
      'Power is the rate of doing work',
    ],
    formulaSheet: ['W = Fd cos(θ)', 'KE = ½mv²', 'PE = mgh', 'P = W/t'],
    summary: 'Work, energy and power are interrelated quantities describing how forces transfer and transform energy.',
    relatedQuestionIds: ['q-physics-3'],
    completed: false,
  },
);

// Chemistry > Atomic Structure — full guided-teaching lessons live in their own
// module because of their size (see lessons/chemistryAtomicStructure.ts).
lessons.push(...atomicStructureLessons);

// Light lessons for every other chapter, using per-chapter question links where available.
for (const chapter of chapters) {
  if (chapter.id in flagshipLessonCounts) continue;
  const lessonId = chapter.lessonIds[0];
  const base = lightNotes.default;
  lessons.push({
    id: lessonId,
    chapterId: chapter.id,
    title: `${chapter.title} — Overview`,
    notes: `${chapter.title}: ${base.notes}`,
    importantPoints: base.points,
    formulaSheet: [],
    summary: base.summary,
    relatedQuestionIds: [],
    completed: chapter.completedLessons > 0,
  });
}

export function getChaptersBySubject(subjectId: string): Chapter[] {
  return chapters.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order);
}

export function getChapterById(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}

export function getLessonsByChapter(chapterId: string): Lesson[] {
  return lessons.filter((l) => l.chapterId === chapterId);
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
