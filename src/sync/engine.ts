import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import {
  deadLetters,
  markFailed,
  markSucceeded,
  nextBatch,
  pendingCount,
  retryDeadLetters,
} from '@/db/repositories/outboxRepo';
import { isFirebaseConfigured } from '@/services/firebase';
import { PermanentPushError, pushRow } from './push';
import { pullContent } from './pull';
import { backoffMs, syncPlan, type ConnectionType, type NetworkSnapshot, type SyncPlan } from './policy';

/**
 * The sync engine.
 *
 * Owns the answer to "is this device in step with the server", and is the only
 * thing allowed to mutate outbox attempt counters. It is deliberately *not* a
 * React hook: drains are triggered by NetInfo and by explicit user action, both
 * of which can happen while no relevant screen is mounted.
 *
 * Lifecycle
 *   startSyncEngine()  once, from the root layout
 *   → NetInfo listener fires on every connectivity transition
 *   → drain() pushes the outbox oldest-first, then optionally pulls content
 *   → subscribers (syncStore) re-render the status banner
 *
 * The engine never throws to its caller. A failed drain is an expected state,
 * not an error — that is the whole premise of an offline-first app.
 */

/** A row that fails this many times stops being retried automatically. */
export const MAX_ATTEMPTS = 5;

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  /** Outbox rows still waiting (excludes dead letters). */
  pendingCount: number;
  /** Rows that exhausted MAX_ATTEMPTS and need manual retry. */
  deadLetterCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** Why the current plan allows/defers what it does. */
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

/** In-memory backoff gate, keyed by outbox row id. Intentionally not persisted:
 *  a restart is itself a reason to retry immediately. */
const nextEligibleAt = new Map<number, number>();

let draining = false;
let lastNet: NetworkSnapshot = {
  isConnected: false,
  isInternetReachable: null,
  type: 'unknown',
};
let getDataSaver: () => boolean = () => false;

// ── Status plumbing ────────────────────────────────────────────────────────

export function getSyncStatus(): SyncStatus {
  return status;
}

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

// ── Network snapshot ───────────────────────────────────────────────────────

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

// ── The drain ──────────────────────────────────────────────────────────────

/**
 * Pushes queued mutations, then pulls content if the plan permits.
 *
 * Re-entrancy is guarded rather than queued: if a drain is already running,
 * a second trigger is a no-op. The listener will fire again on the next
 * transition, and nothing is lost because the outbox is the source of truth.
 */
export async function drain(options: { force?: boolean } = {}): Promise<void> {
  if (draining) return;

  const plan = currentPlan();

  if (!plan.pushText && !options.force) {
    setStatus({ phase: 'offline', planReason: plan.reason, isOnline: false });
    await refreshCounts();
    return;
  }

  if (!isFirebaseConfigured()) {
    // No backend wired up yet. This is the same code path as being offline —
    // work accumulates locally and flushes once a config exists.
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
          // Bad data, not a bad network. Skip it and keep draining the rest.
          continue;
        }

        // Likely the connection died mid-batch. Stop now instead of burning
        // the retry budget of every remaining row on the same failure.
        networkFailure = true;
        setStatus({ lastError: message });
        break;
      }
    }

    if (!networkFailure && plan.pullContent) {
      await pullContent();
    }

    await refreshCounts();
    setStatus({
      phase: networkFailure ? 'error' : 'idle',
      lastSyncedAt: networkFailure ? status.lastSyncedAt : new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus({ phase: 'error', lastError: message });
    await refreshCounts().catch(() => {});
  } finally {
    draining = false;
  }
}

/** Manual "Sync now" from Settings. Bypasses the offline short-circuit so the
 *  user gets a real error instead of silence. */
export async function syncNow(): Promise<void> {
  await drain({ force: true });
}

/** Settings action: reset dead letters and try them again. */
export async function retryFailed(): Promise<void> {
  await retryDeadLetters();
  nextEligibleAt.clear();
  await drain({ force: true });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

export interface StartSyncOptions {
  /** Read live from settingsStore so the toggle needs no engine restart. */
  getDataSaverEnabled: () => boolean;
}

/**
 * Wires the engine to connectivity changes.
 *
 * @returns an unsubscribe function for the NetInfo listener.
 */
export function startSyncEngine(options: StartSyncOptions): () => void {
  getDataSaver = options.getDataSaverEnabled;

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

    // Only drain on the offline → online edge. Android emits several events per
    // transition; draining on each would fire redundant batches.
    if (wasOffline && plan.pushText) {
      void drain();
    }
  });

  // Cold start: fetch once rather than waiting for the first transition, which
  // may never come if the device is already online and stays that way.
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
