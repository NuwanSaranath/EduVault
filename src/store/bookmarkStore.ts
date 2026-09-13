import { create } from 'zustand';
import {
  addBookmark,
  getBookmarkIds,
  removeBookmark,
} from '@/db/repositories/bookmarkRepo';

/**
 * Bookmarks, backed by SQLite rather than AsyncStorage.
 *
 * Moved off `persist` because bookmarks are no longer only a UI preference: the
 * `bookmarks` table is what pins a lesson against LRU cache eviction, so the
 * database has to be the authority. A bookmark held only in AsyncStorage would
 * let the cache budget delete the very lesson the student saved for the bus.
 */
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

    // Optimistic: the star fills instantly, the write follows.
    set((state) => ({
      bookmarkedLessonIds: isCurrentlyBookmarked
        ? state.bookmarkedLessonIds.filter((id) => id !== lessonId)
        : [...state.bookmarkedLessonIds, lessonId],
    }));

    void (isCurrentlyBookmarked ? removeBookmark(lessonId) : addBookmark(lessonId));
  },

  isBookmarked: (lessonId) => get().bookmarkedLessonIds.includes(lessonId),
}));

export async function hydrateBookmarksFromDb(): Promise<void> {
  useBookmarkStore.getState().hydrate(await getBookmarkIds());
}
