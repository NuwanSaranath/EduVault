import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Chapter, Lesson, PastPaper, Question, Subject } from '@/types';
import { getFirestoreDb, isFirebaseConfigured } from '@/services/firebase';
import { getDb } from '@/db';
import {
  upsertChapters,
  upsertLessons,
  upsertPastPapers,
  upsertQuestions,
  upsertSubjects,
} from '@/db/repositories/contentRepo';
import { getCursor, setCursor } from '@/db/repositories/progressRepo';
import { enforceCacheBudget } from '@/db/cachePolicy';

/**
 * The pull half of sync: refreshes cached syllabus content from Firestore.
 *
 * Incremental by design. Every content document carries an `updatedAt`, and the
 * last value seen per collection is stored as a cursor in `sync_meta`, so a
 * refresh transfers only what changed. On a metered connection this is the
 * difference between a few kilobytes and re-downloading every lesson.
 *
 * Content is pulled, never pushed — students do not author syllabus data, so
 * this direction needs no conflict resolution at all.
 */

export interface PullReport {
  subjects: number;
  chapters: number;
  lessons: number;
  questions: number;
  pastPapers: number;
  evicted: number;
}

const EMPTY_REPORT: PullReport = {
  subjects: 0,
  chapters: 0,
  lessons: 0,
  questions: 0,
  pastPapers: 0,
  evicted: 0,
};

/**
 * Reads one collection, filtered to documents newer than our cursor.
 *
 * Returns the rows plus the highest `updatedAt` seen, which becomes the next
 * cursor — advanced only after the local write succeeds, so a crash mid-write
 * re-pulls rather than silently skipping.
 */
async function pullCollection<T>(
  name: string,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const db = getFirestoreDb();
  const cursor = await getCursor(name);

  const ref = collection(db, name);
  const q = cursor ? query(ref, where('updatedAt', '>', cursor)) : query(ref);
  const snap = await getDocs(q);

  let nextCursor = cursor;
  const items: T[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown> & { updatedAt?: string };
    if (data.updatedAt && (!nextCursor || data.updatedAt > nextCursor)) {
      nextCursor = data.updatedAt;
    }
    // Strip the sync field so it never leaks into the domain object.
    const { updatedAt: _updatedAt, ...rest } = data;
    items.push({ id: docSnap.id, ...rest } as T);
  });

  return { items, nextCursor };
}

export async function pullContent(): Promise<PullReport> {
  if (!isFirebaseConfigured()) return EMPTY_REPORT;

  const localDb = await getDb();
  const stamp = new Date().toISOString();
  const report = { ...EMPTY_REPORT };

  const subjects = await pullCollection<Subject>('subjects');
  if (subjects.items.length > 0) {
    await upsertSubjects(localDb, subjects.items, stamp);
    report.subjects = subjects.items.length;
  }
  if (subjects.nextCursor) await setCursor('subjects', subjects.nextCursor);

  const chapters = await pullCollection<Chapter>('chapters');
  if (chapters.items.length > 0) {
    await upsertChapters(localDb, chapters.items, stamp);
    report.chapters = chapters.items.length;
  }
  if (chapters.nextCursor) await setCursor('chapters', chapters.nextCursor);

  const lessons = await pullCollection<Lesson>('lessons');
  if (lessons.items.length > 0) {
    await upsertLessons(localDb, lessons.items, stamp);
    report.lessons = lessons.items.length;
  }
  if (lessons.nextCursor) await setCursor('lessons', lessons.nextCursor);

  const questions = await pullCollection<Question>('questions');
  if (questions.items.length > 0) {
    await upsertQuestions(localDb, questions.items, stamp);
    report.questions = questions.items.length;
  }
  if (questions.nextCursor) await setCursor('questions', questions.nextCursor);

  const papers = await pullCollection<PastPaper>('pastPapers');
  if (papers.items.length > 0) {
    await upsertPastPapers(localDb, papers.items, stamp);
    report.pastPapers = papers.items.length;
  }
  if (papers.nextCursor) await setCursor('pastPapers', papers.nextCursor);

  // A pull is the only thing that grows the cache, so this is the natural place
  // to enforce the budget rather than polling for it.
  report.evicted = (await enforceCacheBudget()).length;

  return report;
}
