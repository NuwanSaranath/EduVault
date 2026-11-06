import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from '@/services/firebase';
import type { OutboxOp, OutboxRow } from '@/db/repositories/outboxRepo';
import { EMPTY_SNAPSHOT, type ProgressSnapshot } from '@/features/progress/snapshot';
import { markAttemptSynced, markPaperResultSynced } from '@/db/repositories/attemptRepo';
import { markEventSynced, purgeEvent } from '@/db/repositories/plannerRepo';
import { markBookmarkSynced } from '@/db/repositories/bookmarkRepo';
import { mergeProgress } from './merge';

// Push side of sync. Sends one outbox row to firestore and marks the local
// row as synced. Errors are thrown so the engine can decide retry or give up.

// for errors that retrying won't fix
export class PermanentPushError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentPushError';
  }
}

// throws if not signed in (that one can be retried)
function requireUid(): string {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    // not permanent, they might just not be logged in yet. the row waits in
    // the outbox until they log in
    throw new Error('No signed-in user');
  }
  return uid;
}

export async function pushRow(row: OutboxRow): Promise<void> {
  const uid = requireUid();
  const payload = JSON.parse(row.payload) as Record<string, unknown>;

  switch (row.entity) {
    case 'quizAttempt':
      await pushAppendOnly(uid, 'attempts', row.entity_id, payload);
      await markAttemptSynced(row.entity_id);
      return;

    case 'paperResult':
      await pushAppendOnly(uid, 'paperResults', row.entity_id, payload);
      await markPaperResultSynced(row.entity_id);
      return;

    case 'plannerEvent':
      await pushPlannerEvent(uid, row.op, row.entity_id, payload);
      return;

    case 'progress':
      await pushProgress(uid, payload as unknown as ProgressSnapshot);
      return;

    case 'bookmark':
      await pushBookmark(uid, row.op, row.entity_id, payload);
      return;

    case 'tutorQuestion':
      await pushAppendOnly(uid, 'tutorQuestions', row.entity_id, payload);
      return;

    default:
      throw new PermanentPushError(`Unknown outbox entity: ${row.entity}`);
  }
}

// doc id is the id made on the phone, so pushing the same row twice just
// writes the same data again. no duplicates if we lose the reply and retry
async function pushAppendOnly(
  uid: string,
  sub: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(doc(collection(db, 'users', uid, sub), id), {
    ...payload,
    syncedAt: new Date().toISOString(),
  });
}

// last write wins, but checked against firestore inside a transaction.
// otherwise an old edit stuck in the outbox for days would overwrite a newer
// one from another device just because it arrived last
async function pushPlannerEvent(
  uid: string,
  op: OutboxOp,
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(collection(db, 'users', uid, 'planner'), id);

  if (op === 'delete') {
    await deleteDoc(ref);
    await purgeEvent(id);
    return;
  }

  const localUpdatedAt = String(payload.updatedAt ?? '');

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const remoteUpdatedAt = snap.exists() ? String(snap.data().updatedAt ?? '') : '';
    if (remoteUpdatedAt && remoteUpdatedAt > localUpdatedAt) return; // remote is newer
    tx.set(ref, payload);
  });

  await markEventSynced(id);
}

// progress can't just be overwritten. read the server copy and merge it
// (same mergeProgress as pull) so all devices end up with the same xp
async function pushProgress(uid: string, local: ProgressSnapshot): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, 'users', uid, 'progress', 'summary');

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const remote = snap.exists()
      ? ({ ...EMPTY_SNAPSHOT, ...snap.data() } as ProgressSnapshot)
      : EMPTY_SNAPSHOT;
    tx.set(ref, mergeProgress(local, remote));
  });
}

async function pushBookmark(
  uid: string,
  op: OutboxOp,
  lessonId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(collection(db, 'users', uid, 'bookmarks'), lessonId);
  if (op === 'delete') {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, payload);
  await markBookmarkSynced(lessonId);
}

// used when someone logs in for the first time on this device
export async function fetchRemoteProgress(): Promise<ProgressSnapshot | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(getFirestoreDb(), 'users', uid, 'progress', 'summary'));
  if (!snap.exists()) return null;
  return { ...EMPTY_SNAPSHOT, ...snap.data() } as ProgressSnapshot;
}
