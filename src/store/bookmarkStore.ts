import { create } from 'zustand';
import {
  addBookmark,
  getBookmarkIds,
  removeBookmark,
} from '@/db/repositories/bookmarkRepo';

// bookmarks are in sqlite, not AsyncStorage, because the bookmarks table is
// what stops the cache cleanup from deleting a saved lesson
interface BookmarkState {
  bookmarkedLessonIds: string[];
  hasHydrated: boolean;
  toggleBookmark: (lessonId: string) => void;
  isBookmarked: (lessonId: string) => boolean;
  hydrate: (ids: string[]) => void;
}

export const useBookmarkStore = create<BookmarkState>()((set, get) => ({
  bookmarkedLessonIds: [],
  hasHydrated: false,

  hydrate: (ids) => set({ bookmarkedLessonIds: ids, hasHydrated: true }),

  toggleBookmark: (lessonId) => {
    const isCurrentlyBookmarked = get().bookmarkedLessonIds.includes(lessonId);

    // update the ui first, save after
    set((state) => ({
      bookmarkedLessonIds: isCurrentlyBookmarked
        ? state.bookmarkedLessonIds.filter((id) => id !== lessonId)
        : [...state.bookmarkedLessonIds, lessonId],
    }));

    void (isCurrentlyBookmarked ? removeBookmark(lessonId) : addBookmark(lessonId));
  },

  isBookmarked: (lessonId) => get().bookmarkedLessonIds.includes(lessonId),
}));

// load from sqlite at startup
export async function hydrateBookmarksFromDb(): Promise<void> {
  useBookmarkStore.getState().hydrate(await getBookmarkIds());
}
