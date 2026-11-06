// Decides what is allowed to sync on the current connection.
// e.g. don't upload a 2 MB photo on someone's prepaid mobile data.
// Called on every drain so network changes and the Data Saver toggle apply
// right away. No imports so it's easy to unit test.

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'other' | 'none' | 'unknown';

export interface NetworkSnapshot {
  isConnected: boolean;
  // connected to wifi but no internet is possible, so netinfo has this separately
  isInternetReachable: boolean | null;
  type: ConnectionType;
  // android low data mode
  isMetered?: boolean;
}

export interface SyncPlan {
  // quiz attempts, planner, progress, bookmarks
  pushText: boolean;
  // photos from Snap & Ask
  pushMedia: boolean;
  // download new syllabus content
  pullContent: boolean;
  // how many outbox rows per drain
  batchSize: number;
  // shown in settings
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
  // null = netinfo hasn't checked yet. treat as online, worst case one
  // attempt fails and the outbox retries it
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
      // smaller batches on paid data, fail early if the connection drops
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

// exponential backoff with a cap. based on each row's own attempts so one
// broken row doesn't slow down the others
export function backoffMs(attempts: number): number {
  const base = 2_000;
  const capped = Math.min(attempts, 5);
  return base * 2 ** capped; // 2s, 4s, 8s … 64s
}
