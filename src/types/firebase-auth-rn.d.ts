import type { Persistence } from 'firebase/auth';

/**
 * `getReactNativePersistence` ships in the `react-native` entry point of
 * @firebase/auth but is omitted from the published `firebase/auth` type
 * definitions, which only declare the browser and node surfaces. Metro resolves
 * the RN build at runtime, so the function does exist — this augments the types
 * so call sites need no cast or @ts-expect-error.
 *
 * The top-level `import type` above is load-bearing: without it this file is not
 * a module, and `declare module` would *replace* firebase/auth's declarations
 * instead of adding to them, hiding every real export.
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
