import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import {
  deadLetters,
  markFailed,
  markSucceeded,
  nextBatch,
  pendingCount,
  retryDeadLetters,
} from '@/db/repositories/outboxRepo';
import { getLastSyncedAt, setLastSyncedAt } from '@/db/repositories/progressRepo';
import { isFirebaseConfigured } from '@/services/firebase';
import { PermanentPushError, pushRow } from './push';
import { pullContent } from './pull';
import { backoffMs, syncPlan, type ConnectionType, type NetworkSnapshot, type SyncPlan } from './policy';

// Sync engine.
// Not a hook on purpose: NetInfo and the "Sync now" button can trigger a sync
// when no screen is open.
//
// startSyncEngine() runs once from the root layout. NetInfo then calls drain()
// when the network comes back. drain() pushes the outbox (oldest first) and
// pulls content if allowed. syncStore listens and updates the banner.
//
// It never throws. Failing to sync while offline is normal for this app.

// after this many fails a row stops retrying by itself
export const MAX_ATTEMPTS = 5;

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  // rows still waiting (not counting dead letters)
  pendingCount: number;
  // rows that hit MAX_ATTEMPTS, need manual retry
  deadLetterCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  // why sync is allowed / held back right now
  planReason: string;
  isOnline: boolean;
  connectionType: ConnectionType;
}

const INITIAL_STATUS: SyncStatus = {
  phase: 'idle',
  pendingCount: 0,
  deadLetterCount: 0,
  lastSyncedAt: null,
  lastError: null,
  planReason: 'Waiting for network status',
  isOnline: false,
  connectionType: 'unknown',
};

let status: SyncStatus = INITIAL_STATUS;
const listeners = new Set<(s: SyncStatus) => void>();

// backoff time per outbox row id. only in memory, a restart can just retry
const nextEligibleAt = new Map<number, number>();

let draining = false;
let lastNet: NetworkSnapshot = {
  isConnected: false,
  isInternetReachable: null,
  type: 'unknown',
};
let getDataSaver: () => boolean = () => false;

// status

export function getSyncStatus(): SyncStatus {
  return status;
}

// returns unsubscribe
export function subscribeToSync(listener: (s: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

async function refreshCounts(): Promise<void> {
  const [pending, dead] = await Promise.all([
    pendingCount(MAX_ATTEMPTS),
    deadLetters(MAX_ATTEMPTS),
  ]);
  setStatus({ pendingCount: pending, deadLetterCount: dead.length });
}

// network

function toSnapshot(state: NetInfoState): NetworkSnapshot {
  const details = state.details as { isConnectionExpensive?: boolean } | null;
  return {
    isConnected: Boolean(state.isConnected),
    isInternetReachable: state.isInternetReachable,
    type: (state.type as ConnectionType) ?? 'unknown',
    isMetered: details?.isConnectionExpensive ?? undefined,
  };
}

export function currentPlan(): SyncPlan {
  return syncPlan(lastNet, getDataSaver());
}

// drain

// push the outbox, then pull content if the plan allows it.
// if a drain is already running just skip. the outbox keeps everything so
// nothing gets lost, it will run again on the next network change.
export async function drain(options: { force?: boolean } = {}): Promise<void> {
  if (draining) return;

  const plan = currentPlan();

  if (!plan.pushText && !options.force) {
    setStatus({ phase: 'offline', planReason: plan.reason, isOnline: false });
    await refreshCounts();
    return;
  }

  if (!isFirebaseConfigured()) {
    // no firebase config yet, treat it like offline. things stay queued
    setStatus({
      phase: 'offline',
      planReason: 'No backend configured — changes queued locally',
    });
    await refreshCounts();
    return;
  }

  draining = true;
  setStatus({ phase: 'syncing', planReason: plan.reason, isOnline: true, lastError: null });

  try {
    const rows = await nextBatch(MAX_ATTEMPTS, plan.batchSize, plan.pushMedia);
    const now = Date.now();
    let networkFailure = false;

    for (const row of rows) {
      const gate = nextEligibleAt.get(row.id);
      if (gate && gate > now) continue; // still backing off

      try {
        await pushRow(row);
        await markSucceeded(row.id);
        nextEligibleAt.delete(row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markFailed(row.id, message);
        nextEligibleAt.set(row.id, Date.now() + backoffMs(row.attempts + 1));

        if (error instanceof PermanentPushError) {
          // bad data not bad network, skip it and carry on
          continue;
        }

        // probably lost connection, stop here so the other rows don't use up
        // their retries on the same problem
        networkFailure = true;
        setStatus({ lastError: message });
        break;
      }
    }

    if (!networkFailure && plan.pullContent) {
      await pullContent();
    }

    await refreshCounts();

    let lastSyncedAt = status.lastSyncedAt;
    if (!networkFailure) {
      lastSyncedAt = new Date().toISOString();
      // save it so it shows even after a restart
      await setLastSyncedAt(lastSyncedAt);
    }
    setStatus({ phase: networkFailure ? 'error' : 'idle', lastSyncedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus({ phase: 'error', lastError: message });
    await refreshCounts().catch(() => {});
  } finally {
    draining = false;
  }
}

// "Sync now" button. ignores the offline check so the user sees the real error
export async function syncNow(): Promise<void> {
  await drain({ force: true });
}

// reset dead letters and try again
export async function retryFailed(): Promise<void> {
  await retryDeadLetters();
  nextEligibleAt.clear();
  await drain({ force: true });
}

// start / stop

export interface StartSyncOptions {
  // read from settingsStore each time so toggling needs no restart
  getDataSaverEnabled: () => boolean;
}

// hook up to NetInfo. returns a function to stop it
export function startSyncEngine(options: StartSyncOptions): () => void {
  getDataSaver = options.getDataSaverEnabled;

  // load last sync time from db (for offline start)
  void getLastSyncedAt()
    .then((saved) => {
      if (saved && !status.lastSyncedAt) setStatus({ lastSyncedAt: saved });
    })
    .catch(() => {});

  const unsubscribe = NetInfo.addEventListener((state) => {
    const snapshot = toSnapshot(state);
    const wasOffline = !lastNet.isConnected || lastNet.isInternetReachable === false;
    lastNet = snapshot;

    const plan = syncPlan(snapshot, getDataSaver());
    setStatus({
      isOnline: plan.pushText,
      connectionType: snapshot.type,
      planReason: plan.reason,
    });

    // only sync when going offline -> online. android sends a few events for
    // one change and we don't want to sync for each
    if (wasOffline && plan.pushText) {
      void drain();
    }
  });

  // check once at start too, if the phone is already online there may be no
  // change event for a long time
  void NetInfo.fetch().then((state) => {
    lastNet = toSnapshot(state);
    void drain();
  });

  return () => {
    unsubscribe();
    listeners.clear();
    nextEligibleAt.clear();
  };
}
