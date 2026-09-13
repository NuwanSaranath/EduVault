import type { Chapter, Lesson } from '@/types';
import {
  getChapter,
  getChaptersBySubject,
  getLesson,
  getLessonsByChapter,
  getRecommendedLessons,
} from '@/db/repositories/contentRepo';

/**
 * Theory content read from the SQLite cache.
 *
 * `fetchLesson` is the one read with a side effect: it stamps the lesson's
 * `last_read_at`, which is what gives the LRU cache budget something to rank by.
 * Reading a lesson is therefore also the act of protecting it from eviction.
 */
export async function fetchChapters(subjectId: string): Promise<Chapter[]> {
  return getChaptersBySubject(subjectId);
}

export async function fetchChapter(chapterId: string): Promise<Chapter | undefined> {
  return (await getChapter(chapterId)) ?? undefined;
}

export async function fetchLessons(chapterId: string): Promise<Lesson[]> {
  return getLessonsByChapter(chapterId);
}

export async function fetchLesson(lessonId: string): Promise<Lesson | undefined> {
  return (await getLesson(lessonId)) ?? undefined;
}

/**
 * Home-screen suggestions.
 *
 * Takes the completed chapter ids from the caller rather than reading progress
 * itself — progress lives in a store, content lives in the database, and having
 * a content service reach into store state would couple the two layers.
 */
export async function fetchRecommendedLessons(
  completedChapterIds: string[],
  limit = 3,
): Promise<Lesson[]> {
  return getRecommendedLessons(limit, completedChapterIds);
}
