import type { Chapter, Lesson } from '@/types';
import {
  getChapter,
  getChaptersBySubject,
  getLesson,
  getLessonsByChapter,
  getRecommendedLessons,
} from '@/db/repositories/contentRepo';

// theory content from sqlite. fetchLesson also updates last_read_at, which
// is what the cache cleanup uses, so reading a lesson keeps it from being deleted
export async function fetchChapters(subjectId: string): Promise<Chapter[]> {
  return getChaptersBySubject(subjectId);
}

export async function fetchChapter(chapterId: string): Promise<Chapter | undefined> {
  return (await getChapter(chapterId)) ?? undefined;
}

export async function fetchLessons(chapterId: string): Promise<Lesson[]> {
  return getLessonsByChapter(chapterId);
}

// also marks it as recently read
export async function fetchLesson(lessonId: string): Promise<Lesson | undefined> {
  return (await getLesson(lessonId)) ?? undefined;
}

// suggestions for home. completed ids are passed in so this service
// doesn't need to read the progress store
export async function fetchRecommendedLessons(
  completedChapterIds: string[],
  limit = 3,
): Promise<Lesson[]> {
  return getRecommendedLessons(limit, completedChapterIds);
}
