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

/**
 * First-launch bootstrap: loads the bundled syllabus into SQLite.
 *
 * This exists because offline-first has a cold-start problem. A student who
 * installs the app on the bus, with no signal, would otherwise open it to an
 * empty shell — the sync engine cannot pull anything, and there is no cache to
 * fall back on. Shipping a baseline copy of the content inside the bundle means
 * the very first launch is already useful, and the first successful pull just
 * updates what is already there.
 *
 * Idempotent and cheap: it returns immediately once `subjects` has any rows, so
 * it can be called unconditionally on every launch.
 */
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
  // Epoch stamp, not "now": a bundled row must always lose to a pulled row, and
  // `updatedAt` is what the content cursor compares. Stamping the bundle with
  // the current time would make the first real pull look older than the seed.
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
