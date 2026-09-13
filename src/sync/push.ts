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

/**
 * The push half of sync: applies one outbox row to Firestore, then flips the
 * local row's `synced` flag.
 *
 * Errors are thrown, not swallowed — the engine decides whether a failure means
 * "retry later" (network) or "give up" (validation), and only it may touch the
 * attempt counter.
 */

/** Thrown for failures that retrying cannot fix, so the engine stops early. */
export class PermanentPushError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentPushError';
  }
}

function requireUid(): string {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    // Not permanent: the student may simply not have signed in yet. The row
    // waits in the outbox and flushes after the next successful login.
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

/**
 * Append-only writes are idempotent by construction: the document id is the
 * client-generated entity id, so replaying a row that already landed is a
 * harmless overwrite with identical data. That is what makes "push, lose the
 * ack, push again" safe without server-side de-duplication.
 */
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

/**
 * Last-write-wins, enforced on the server side of the comparison.
 *
 * Reading the remote `updatedAt` inside a transaction stops a stale queued edit
 * from clobbering a newer one made on another device — without it, a mutation
 * that sat in the outbox for two days would win purely by arriving last.
 */
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

/**
 * Progress is the only entity where the client must not simply overwrite.
 *
 * The transaction reads the server snapshot and runs the same `mergeProgress`
 * the pull side uses, so XP and completion sets converge to the same value
 * regardless of which device pushes last or in what order.
 */
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

/** Used by the engine's first-login reconciliation. */
export async function fetchRemoteProgress(): Promise<ProgressSnapshot | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(getFirestoreDb(), 'users', uid, 'progress', 'summary'));
  if (!snap.exists()) return null;
  return { ...EMPTY_SNAPSHOT, ...snap.data() } as ProgressSnapshot;
}
