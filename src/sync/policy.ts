/**
 * Constrained-design policy #3: decide *what* may sync before deciding *how*.
 *
 * A student on a prepaid cellular plan should not have a 2 MB question photo
 * pushed the moment they walk out of Wi-Fi range. The engine asks this function
 * on every drain, so connectivity changes and the Data Saver toggle both take
 * effect on the next batch with no listener re-wiring.
 *
 * Pure and dependency-free so it can be unit-tested without a device.
 */

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'other' | 'none' | 'unknown';

export interface NetworkSnapshot {
  isConnected: boolean;
  /** NetInfo reports this separately: associated to an AP but no route out. */
  isInternetReachable: boolean | null;
  type: ConnectionType;
  /** True when the OS itself is in a metered/low-data mode (Android only). */
  isMetered?: boolean;
}

export interface SyncPlan {
  /** Push queued text mutations (attempts, planner, progress, bookmarks). */
  pushText: boolean;
  /** Push mutations carrying an image (Snap & Ask captures). */
  pushMedia: boolean;
  /** Pull refreshed syllabus content. */
  pullContent: boolean;
  /** How many outbox rows to attempt in one drain. */
  batchSize: number;
  /** Human-readable justification, surfaced in the Settings sync panel. */
  reason: string;
}

const OFFLINE: SyncPlan = {
  pushText: false,
  pushMedia: false,
  pullContent: false,
  batchSize: 0,
  reason: 'Offline — changes are queued locally',
};

export function syncPlan(net: NetworkSnapshot, dataSaverEnabled: boolean): SyncPlan {
  // `isInternetReachable === null` means NetInfo has not probed yet. Treat that
  // as usable rather than offline: a false negative here delays every sync on
  // cold start, whereas a false positive just costs one failed attempt that the
  // outbox retries anyway.
  if (!net.isConnected || net.isInternetReachable === false) return OFFLINE;

  const unmetered = net.type === 'wifi' || net.type === 'ethernet';

  if (unmetered) {
    return {
      pushText: true,
      pushMedia: true,
      pullContent: true,
      batchSize: 50,
      reason: 'On Wi-Fi — full sync',
    };
  }

  if (dataSaverEnabled || net.isMetered) {
    return {
      pushText: true,
      pushMedia: false,
      pullContent: false,
      // Smaller batches: each request is billed data, so fail fast and cheap
      // rather than pushing 50 rows into a connection that is about to drop.
      batchSize: 10,
      reason: 'Data Saver on — results sync now, photos wait for Wi-Fi',
    };
  }

  return {
    pushText: true,
    pushMedia: true,
    pullContent: false,
    batchSize: 25,
    reason: 'On mobile data — syncing results, content refresh deferred',
  };
}

/**
 * Exponential backoff with a cap, keyed on the row's own attempt count.
 *
 * Stored per row rather than per engine run, so a poison message backs off
 * without also throttling healthy rows queued behind it.
 */
export function backoffMs(attempts: number): number {
  const base = 2_000;
  const capped = Math.min(attempts, 5);
  return base * 2 ** capped; // 2s, 4s, 8s … 64s
}
