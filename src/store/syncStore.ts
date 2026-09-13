import { create } from 'zustand';
import {
  getSyncStatus,
  subscribeToSync,
  syncNow,
  retryFailed,
  type SyncStatus,
} from '@/sync/engine';

/**
 * React mirror of the sync engine's status.
 *
 * The engine owns the truth because it runs outside React (NetInfo callbacks);
 * this store exists only so components can subscribe with the same hook shape
 * as every other piece of state in the app. Deliberately not persisted — status
 * is derived from the outbox on every launch, so a stale cached copy would be
 * worse than no copy.
 */
interface SyncState extends SyncStatus {
  /** Set once the engine's listener is attached. */
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

/** Convenience selector for the banner: is there anything worth showing? */
export function selectShouldWarn(state: SyncState): boolean {
  return !state.isOnline || state.pendingCount > 0 || state.deadLetterCount > 0;
}
