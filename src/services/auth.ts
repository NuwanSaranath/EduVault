import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Stream, User } from '@/types';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from './firebase';
import { ApiError } from './api/client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  school: string;
  district: string;
  alYear: string;
  stream: Stream;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Firebase login/register, profile saved in firestore.
// Login needs internet, you can't check a password offline. But the session is
// saved (getReactNativePersistence in firebase.ts) so once logged in you stay
// logged in offline. Only a new login needs a connection.
function ensureConfigured(): void {
  if (!isFirebaseConfigured()) {
    throw new ApiError(
      'No backend configured. Add EXPO_PUBLIC_FB_* values to .env to enable sign-in.',
      503,
    );
  }
}

// firebase error codes -> messages the student understands
function toApiError(error: unknown): ApiError {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return new ApiError('That email address is not valid.', 400);
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new ApiError('Email or password is incorrect.', 401);
    case 'auth/email-already-in-use':
      return new ApiError('An account already exists for that email.', 409);
    case 'auth/weak-password':
      return new ApiError('Password must be at least 6 characters.', 400);
    case 'auth/too-many-requests':
      return new ApiError('Too many attempts. Try again in a few minutes.', 429);
    case 'auth/network-request-failed':
      return new ApiError('You appear to be offline. Sign-in needs a connection.', 503);
    default:
      return new ApiError(
        error instanceof Error ? error.message : 'Sign-in failed. Please try again.',
        500,
      );
  }
}

// create the firebase user and their profile doc
export async function register(payload: RegisterPayload): Promise<User> {
  ensureConfigured();

  try {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      payload.email.trim(),
      payload.password,
    );

    const user: User = {
      id: credential.user.uid,
      name: payload.name.trim(),
      email: payload.email.trim(),
      school: payload.school,
      district: payload.district,
      alYear: payload.alYear,
      stream: payload.stream,
      createdAt: new Date().toISOString(),
    };

    // profile is under users/{uid} so one rule covers all their data:
    // allow read, write: if request.auth.uid == uid
    const { id, ...profile } = user;
    await setDoc(doc(getFirestoreDb(), 'users', id), profile);

    return user;
  } catch (error) {
    throw toApiError(error);
  }
}

// sign in and load the profile doc
export async function login(payload: LoginPayload): Promise<User> {
  if (!payload.email || !payload.password) {
    throw new ApiError('Email and password are required', 400);
  }
  ensureConfigured();

  try {
    const credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      payload.email.trim(),
      payload.password,
    );

    const snapshot = await getDoc(doc(getFirestoreDb(), 'users', credential.user.uid));
    if (!snapshot.exists()) {
      throw new ApiError('Your profile is missing. Please register again.', 404);
    }

    return { id: credential.user.uid, ...snapshot.data() } as User;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(error);
  }
}

export async function requestPasswordReset(email: string): Promise<{ sent: boolean }> {
  if (!email) throw new ApiError('Email is required', 400);
  ensureConfigured();

  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
    return { sent: true };
  } catch (error) {
    throw toApiError(error);
  }
}

// sign out of firebase but keep the sqlite data. if we wiped it, quizzes
// that haven't synced yet would be lost. they sync after the next login
export async function logout(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // already signed out or offline, the store clears the session anyway
  }
}

export function currentUserId(): string | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser?.uid ?? null;
}
