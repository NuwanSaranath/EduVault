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

/**
 * Brings the persistence and sync layers up before the first screen renders.
 *
 * Order matters and is not arbitrary:
 *   1. Open SQLite and run migrations — everything below needs the schema.
 *   2. Seed bundled content if the cache is empty, so a first launch with no
 *      signal still has a syllabus to show.
 *   3. Hydrate the Zustand stores from SQLite, making the database the source of
 *      truth rather than AsyncStorage.
 *   4. Start the sync engine last, so its first drain cannot race a half-built
 *      store and push a partial snapshot.
 *
 * A failure here is reported, not swallowed. If the database cannot open, the app
 * has no offline story at all, and silently falling back to an empty UI would be
 * indistinguishable from having no content.
 */
export function useAppBootstrap(): { phase: BootstrapPhase; error: string | null } {
  const [phase, setPhase] = useState<BootstrapPhase>('starting');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode/Fast Refresh can fire effects twice; the engine must only be
    // wired once or every connectivity change would drain in duplicate.
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
          // Read through the store rather than capturing the value, so toggling
          // Data Saver changes behaviour without restarting the engine.
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
