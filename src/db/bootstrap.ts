import { subjects } from '@/constants/data/subjects';
import { chapters, lessons } from '@/constants/data/chapters';
import { questions } from '@/constants/data/questions';
import { pastPapers } from '@/constants/data/pastPapers';
import { getDb } from './index';
import {
  isContentEmpty,
  upsertChapters,
  upsertLessons,
  upsertPastPapers,
  upsertQuestions,
  upsertSubjects,
} from './repositories/contentRepo';

// First launch: copy the bundled syllabus into sqlite.
// If someone installs the app with no signal they'd see an empty app, sync
// can't download anything yet. So we ship the content in the app and load it.
// Returns straight away if subjects already has rows, safe to call every launch.
export interface BootstrapReport {
  seeded: boolean;
  subjects: number;
  chapters: number;
  lessons: number;
  questions: number;
  pastPapers: number;
}

export async function bootstrapContent(): Promise<BootstrapReport> {
  const empty = await isContentEmpty();
  if (!empty) {
    return {
      seeded: false,
      subjects: 0,
      chapters: 0,
      lessons: 0,
      questions: 0,
      pastPapers: 0,
    };
  }

  const db = await getDb();
  // use 1970 not now, so anything pulled from firebase later is always newer
  // than the bundled copy
  const stamp = new Date(0).toISOString();

  await upsertSubjects(db, subjects, stamp);
  await upsertChapters(db, chapters, stamp);
  await upsertLessons(db, lessons, stamp);
  await upsertQuestions(db, questions, stamp);
  await upsertPastPapers(db, pastPapers, stamp);

  return {
    seeded: true,
    subjects: subjects.length,
    chapters: chapters.length,
    lessons: lessons.length,
    questions: questions.length,
    pastPapers: pastPapers.length,
  };
}
