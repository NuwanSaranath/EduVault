import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase wiring.
 *
 * Two deliberate decisions here, both documented in
 * docs/decision-records/0002-outbox-over-firestore-offline-persistence.md:
 *
 *  1. `memoryLocalCache()` — Firestore's own on-disk persistence is turned OFF.
 *     SQLite is the single local source of truth; running two caches would mean
 *     two answers to "what does this device know" and no clear owner of merge.
 *
 *  2. `experimentalForceLongPolling` — React Native has no real WebChannel
 *     transport, so streaming reads hang on some carrier networks. Long polling
 *     is slower per request but does not silently stall, which matters more when
 *     the whole point is surviving a bad connection.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FB_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FB_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FB_APP_ID,
};

/**
 * Whether a real backend is reachable at all.
 *
 * With no `.env` the app still runs: content comes from the bundled seed and
 * every mutation piles up in the outbox. That is not a stub — it is exactly the
 * offline path, so a missing config exercises the same code as a dead network.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured — check EXPO_PUBLIC_FB_* in .env');
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(config as Required<typeof config>);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const instance = ensureApp();
    try {
      // Keeps the signed-in user across restarts. Must run before getAuth().
      authInstance = initializeAuth(instance, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Already initialised (Fast Refresh re-runs this module).
      authInstance = getAuth(instance);
    }
  }
  return authInstance;
}

export function getFirestoreDb(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(ensureApp(), {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    });
  }
  return dbInstance;
}
