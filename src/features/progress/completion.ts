import { useMemo } from 'react';
import type { Chapter } from '@/types';
import { useProgressStore } from '@/store/progressStore';

// content tables are just a cache of the server data so they can't know what
// this student finished. completion is in the progress store and every screen
// runs chapters through here so they all match the "Mark Chapter as Complete" button
export function applyChapterCompletion(
  chapter: Chapter,
  completedIds: ReadonlySet<string>,
): Chapter {
  return {
    ...chapter,
    completedLessons: completedIds.has(chapter.id) ? chapter.totalLessons : 0,
  };
}

// completed / total lessons
export function chapterLessonTotals(
  chapters: Chapter[],
  completedIds: ReadonlySet<string>,
): { completedLessons: number; totalLessons: number } {
  let completedLessons = 0;
  let totalLessons = 0;
  for (const chapter of chapters) {
    totalLessons += chapter.totalLessons;
    if (completedIds.has(chapter.id)) completedLessons += chapter.totalLessons;
  }
  return { completedLessons, totalLessons };
}

// as a Set, only rebuilt when it changes
export function useCompletedChapterIds(): ReadonlySet<string> {
  const ids = useProgressStore((s) => s.completedChapterIds);
  return useMemo(() => new Set(ids), [ids]);
}
