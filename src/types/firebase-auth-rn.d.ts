import type { Persistence } from 'firebase/auth';

// getReactNativePersistence exists in the react native build of firebase/auth
// but isn't in its types, so add it here.
// the `import type` above is needed, without it this file isn't a module and
// this would replace firebase/auth's types instead of adding to them
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
