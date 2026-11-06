import { useEffect, useRef, useState } from 'react';
import { initDatabase } from '@/db';
import { bootstrapContent } from '@/db/bootstrap';
import { startSyncEngine } from '@/sync/engine';
import { useSettingsStore } from '@/store/settingsStore';
import { useSyncStore } from '@/store/syncStore';
import { hydrateProgressFromDb } from '@/store/progressStore';
import { hydrateBookmarksFromDb } from '@/store/bookmarkStore';
import { hydratePlannerFromDb } from '@/store/plannerStore';

export type BootstrapPhase = 'starting' | 'ready' | 'failed';

// Sets up the db and sync before the first screen.
// Order matters:
//   1. open sqlite + migrations
//   2. load bundled content if empty (so first launch offline isn't empty)
//   3. load the stores from sqlite
//   4. start sync last so it doesn't push half loaded data
// If the db can't open we show an error, an empty app would just be confusing.
export function useAppBootstrap(): { phase: BootstrapPhase; error: string | null } {
  const [phase, setPhase] = useState<BootstrapPhase>('starting');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // effects can run twice in dev (strict mode / fast refresh), only start once
    // or every network change would sync twice
    if (started.current) return;
    started.current = true;

    let stopSync: (() => void) | undefined;

    (async () => {
      try {
        await initDatabase();
        await bootstrapContent();

        await Promise.all([
          hydrateProgressFromDb(),
          hydrateBookmarksFromDb(),
          hydratePlannerFromDb(),
        ]);

        useSyncStore.getState().bind();
        stopSync = startSyncEngine({
          // read it each time so the toggle works without restarting sync
          getDataSaverEnabled: () => useSettingsStore.getState().dataSaverEnabled,
        });

        setPhase('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase('failed');
      }
    })();

    return () => stopSync?.();
  }, []);

  return { phase, error };
}
