import { create } from 'zustand';
import {
  getSyncStatus,
  subscribeToSync,
  syncNow,
  retryFailed,
  type SyncStatus,
} from '@/sync/engine';

// copy of the sync engine's status for react components.
// not saved, it's worked out from the outbox every launch
interface SyncState extends SyncStatus {
  // true once we're listening to the engine
  bound: boolean;
  bind: () => void;
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  ...getSyncStatus(),
  bound: false,

  bind: () => {
    if (get().bound) return;
    set({ bound: true });
    subscribeToSync((status) => set(status));
  },

  syncNow: async () => {
    await syncNow();
  },

  retryFailed: async () => {
    await retryFailed();
  },
}));

// should the banner show
export function selectShouldWarn(state: SyncState): boolean {
  return !state.isOnline || state.pendingCount > 0 || state.deadLetterCount > 0;
}
