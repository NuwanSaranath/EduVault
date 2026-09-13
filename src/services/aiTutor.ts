import { findAiTutorEntry } from '@/constants/data/aiTutorKnowledgeBase';
import type { AiTutorMessage } from '@/types';
import { getDb } from '@/db';
import { enqueue } from '@/db/repositories/outboxRepo';
import { persistCapture } from '@/features/hardware/imagePipeline';

/**
 * The AI tutor.
 *
 * Answers come from a bundled knowledge base, which is a deliberate choice
 * rather than a placeholder: an explanation that only works with signal is
 * useless to the student this app is for. The local base handles the syllabus
 * topics it knows, instantly and offline.
 *
 * What it cannot answer becomes data instead of a dead end. Both unmatched
 * questions and scanned photos are queued through the outbox as `tutorQuestion`
 * rows, so they reach the backend when a connection appears — the same mechanism
 * quiz results use, with the image deferred to Wi-Fi by `syncPlan`.
 */

const UNKNOWN_REPLY =
  "I don't have a local explanation for that yet. I've saved your question — it will be sent for a full answer next time you're online. In the meantime, try asking about Newton's laws, kinematics, photosynthesis, chemical bonding, or demand & supply.";

const SCAN_RECEIVED_REPLY =
  "Got it — I've saved your photo. Image questions need the server, so this one will be answered once you're on Wi-Fi. Ask me anything in text meanwhile and I'll answer straight away.";

function messageId(): string {
  return `msg-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

/**
 * Answers a typed question.
 *
 * Synchronous in spirit — the local lookup is a map hit, so there is no spinner
 * to justify. Unmatched questions are queued before returning, so the student's
 * input is never silently discarded.
 */
export async function askAiTutor(question: string): Promise<AiTutorMessage> {
  const entry = findAiTutorEntry(question);

  if (entry) {
    return {
      id: messageId(),
      role: 'assistant',
      text: entry.explanation,
      sinhalaText: entry.sinhalaExplanation,
      examples: entry.examples,
      relatedQuestionIds: entry.relatedQuestionIds,
      createdAt: new Date().toISOString(),
    };
  }

  await queueTutorQuestion({ kind: 'text', question });

  return {
    id: messageId(),
    role: 'assistant',
    text: UNKNOWN_REPLY,
    createdAt: new Date().toISOString(),
  };
}

export interface ScanSubmission {
  /** Processed (already downscaled) capture uri. */
  imageUri: string;
  /** Optional typed context the student added alongside the photo. */
  note?: string;
  bytes: number;
}

/**
 * Submits a scanned question.
 *
 * The capture is copied out of the cache directory first: the outbox row will
 * outlive this session, and a reference to a file Android has since cleared
 * would push an empty payload.
 */
export async function submitScannedQuestion(
  submission: ScanSubmission,
): Promise<AiTutorMessage> {
  const id = messageId();
  const durableUri = await persistCapture(submission.imageUri, id);

  await queueTutorQuestion({
    kind: 'image',
    question: submission.note ?? '',
    imageUri: durableUri,
    bytes: submission.bytes,
  });

  return {
    id,
    role: 'assistant',
    text: SCAN_RECEIVED_REPLY,
    createdAt: new Date().toISOString(),
  };
}

interface TutorQueueInput {
  kind: 'text' | 'image';
  question: string;
  imageUri?: string;
  bytes?: number;
}

/**
 * Appends a tutor question to the outbox.
 *
 * `mediaUri` is what makes the Data Saver policy work: rows carrying an image
 * are marked `needs_media`, and `syncPlan` excludes them from the batch on a
 * metered connection while still flushing everything else.
 */
async function queueTutorQuestion(input: TutorQueueInput): Promise<void> {
  const db = await getDb();
  await enqueue(db, {
    entity: 'tutorQuestion',
    op: 'create',
    entityId: messageId(),
    payload: {
      kind: input.kind,
      question: input.question,
      bytes: input.bytes ?? 0,
      askedAt: new Date().toISOString(),
    },
    mediaUri: input.imageUri,
  });
}
