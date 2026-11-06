import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlannerEvent } from '@/types';
import { plannerSeed } from '@/constants/data/planner';
import { cancelReminder, scheduleReminder } from '@/features/planner/reminders';
import { getEvents, softDeleteEvent, upsertEvent } from '@/db/repositories/plannerRepo';

// planner. events are in sqlite and sync. only notificationIds use persist,
// they're ids from this phone's notification scheduler so no point syncing them
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
        // soft delete so the delete still gets pushed if we're offline
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
      // events not included, they're in sqlite
      partialize: (state) => ({ notificationIds: state.notificationIds }),
    },
  ),
);

// load events from sqlite, add a starter timetable if empty. the starter
// one is saved as real rows so it syncs too
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
