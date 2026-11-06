import { findAiTutorEntry } from '@/constants/data/aiTutorKnowledgeBase';
import type { AiTutorMessage } from '@/types';
import { getDb } from '@/db';
import { enqueue } from '@/db/repositories/outboxRepo';
import { persistCapture } from '@/features/hardware/imagePipeline';

// AI tutor.
// Answers come from a knowledge base bundled in the app, so it works offline
// for the syllabus topics it knows.
// Questions it can't answer and scanned photos go into the outbox as
// tutorQuestion rows and get sent when there's a connection (photos wait for
// wifi if data saver is on).

const UNKNOWN_REPLY =
  "I don't have a local explanation for that yet. I've saved your question — it will be sent for a full answer next time you're online. In the meantime, try asking about Newton's laws, kinematics, photosynthesis, chemical bonding, or demand & supply.";

const SCAN_RECEIVED_REPLY =
  "Got it — I've saved your photo. Image questions need the server, so this one will be answered once you're on Wi-Fi. Ask me anything in text meanwhile and I'll answer straight away.";

function messageId(): string {
  return `msg-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

// answer a typed question. it's just a lookup so no loading spinner.
// if there's no match it gets queued so the question isn't lost
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
  // already resized photo
  imageUri: string;
  // optional text the student typed with the photo
  note?: string;
  bytes: number;
}

// copy the photo out of the cache folder first. android can clear the
// cache and the outbox row might wait a long time
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

// add to outbox. mediaUri sets needs_media so syncPlan can skip it on
// mobile data while other stuff still syncs
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
