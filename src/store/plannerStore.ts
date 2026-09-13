import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlannerEvent } from '@/types';
import { plannerSeed } from '@/constants/data/planner';
import { cancelReminder, scheduleReminder } from '@/features/planner/reminders';
import { getEvents, softDeleteEvent, upsertEvent } from '@/db/repositories/plannerRepo';

/**
 * Study planner state.
 *
 * Events live in SQLite and sync under last-write-wins. `persist` is kept for one
 * narrow purpose — `notificationIds` — because those ids belong to the OS
 * scheduler on *this* device and are meaningless on any other. Syncing them would
 * push a local handle to a phone that cannot use it, so they stay in
 * AsyncStorage while the events themselves go to the database.
 */
interface PlannerState {
  events: PlannerEvent[];
  notificationIds: Record<string, string>;
  hasHydrated: boolean;
  addEvent: (event: PlannerEvent) => void;
  removeEvent: (eventId: string) => void;
  toggleReminder: (eventId: string) => Promise<void>;
  hydrate: (events: PlannerEvent[]) => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      events: [],
      notificationIds: {},
      hasHydrated: false,

      hydrate: (events) => set({ events, hasHydrated: true }),

      addEvent: (event) => {
        set((state) => ({ events: [...state.events, event] }));
        void upsertEvent(event);
      },

      removeEvent: (eventId) => {
        set((state) => ({ events: state.events.filter((e) => e.id !== eventId) }));
        // Soft delete: the tombstone must outlive the local row long enough to
        // be pushed, or a delete made offline would never reach the server.
        void softDeleteEvent(eventId);
      },

      toggleReminder: async (eventId) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;

        const nextEnabled = !event.reminderEnabled;
        const updated = { ...event, reminderEnabled: nextEnabled };

        set((state) => ({
          events: state.events.map((e) => (e.id === eventId ? updated : e)),
        }));
        void upsertEvent(updated);

        const existingId = get().notificationIds[eventId];
        if (!nextEnabled && existingId) {
          await cancelReminder(existingId);
          set((state) => {
            const { [eventId]: _removed, ...rest } = state.notificationIds;
            return { notificationIds: rest };
          });
          return;
        }

        if (nextEnabled) {
          const notificationId = await scheduleReminder(updated);
          if (notificationId) {
            set((state) => ({
              notificationIds: { ...state.notificationIds, [eventId]: notificationId },
            }));
          }
        }
      },
    }),
    {
      name: 'eduvault-planner',
      storage: createJSONStorage(() => AsyncStorage),
      // Events deliberately excluded — SQLite owns them.
      partialize: (state) => ({ notificationIds: state.notificationIds }),
    },
  ),
);

/**
 * Loads planner events from SQLite, seeding a first-run schedule if empty.
 *
 * The seed is written through the repository rather than just placed in state, so
 * the starter timetable is a real row set that syncs like any other — otherwise
 * it would silently vanish on a second device.
 */
export async function hydratePlannerFromDb(): Promise<void> {
  let events = await getEvents();

  if (events.length === 0) {
    for (const event of plannerSeed) {
      await upsertEvent(event);
    }
    events = await getEvents();
  }

  usePlannerStore.getState().hydrate(events);
}
