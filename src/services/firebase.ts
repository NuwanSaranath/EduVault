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

// Firebase setup. See docs/decision-records/0002-outbox-over-firestore-offline-persistence.md
//  1. memoryLocalCache - firestore's own offline cache is off. sqlite is our
//     only local copy, two caches would mean two versions of the data.
//  2. experimentalForceLongPolling - streaming can hang on some mobile
//     networks in react native. long polling is slower but doesn't get stuck.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FB_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FB_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FB_APP_ID,
};

// is there a firebase config. without .env the app still works with the
// bundled content and everything stays in the outbox, same as being offline
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

// set up the firebase app once (throws if no config)
function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured — check EXPO_PUBLIC_FB_* in .env');
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(config as Required<typeof config>);
  }
  return app;
}

// auth with the session saved in AsyncStorage
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const instance = ensureApp();
    try {
      // keeps the user logged in after restart. has to run before getAuth()
      authInstance = initializeAuth(instance, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // already set up (fast refresh runs this file again)
      authInstance = getAuth(instance);
    }
  }
  return authInstance;
}

// memory cache only + long polling
export function getFirestoreDb(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(ensureApp(), {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    });
  }
  return dbInstance;
}
