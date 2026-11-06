import type { PastPaperResult, QuizAttempt } from '@/types';
import { getDb, runInTransaction } from '../index';
import { enqueue } from './outboxRepo';

interface Row {
  payload: string;
}

// save the quiz attempt and add it to the outbox in one transaction, so we
// never have a result saved that won't sync. attempts are append only with an
// id made on the phone, so no conflict handling needed
export async function saveAttempt(attempt: QuizAttempt): Promise<void> {
  const db = await getDb();
  await runInTransaction(db, async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO quiz_attempts (id, subject_id, payload, taken_at, synced)
         VALUES (?, ?, ?, ?, 0)`,
      attempt.id,
      attempt.subjectId,
      JSON.stringify(attempt),
      attempt.takenAt,
    );
    await enqueue(db, {
      entity: 'quizAttempt',
      op: 'create',
      entityId: attempt.id,
      payload: attempt,
    });
  });
}

export async function markAttemptSynced(attemptId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE quiz_attempts SET synced = 1 WHERE id = ?', attemptId);
}

// newest first
export async function getAttempts(subjectId?: string): Promise<QuizAttempt[]> {
  const db = await getDb();
  const rows = subjectId
    ? await db.getAllAsync<Row>(
        'SELECT payload FROM quiz_attempts WHERE subject_id = ? ORDER BY taken_at DESC',
        subjectId,
      )
    : await db.getAllAsync<Row>('SELECT payload FROM quiz_attempts ORDER BY taken_at DESC');
  return rows.map((r) => JSON.parse(r.payload) as QuizAttempt);
}

// only the last few, the adaptive quiz doesn't need the whole year and
// reading everything would get slower over time
export async function getRecentAttempts(limit = 50): Promise<QuizAttempt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT payload FROM quiz_attempts ORDER BY taken_at DESC LIMIT ?',
    limit,
  );
  return rows.map((r) => JSON.parse(r.payload) as QuizAttempt);
}

// same as saveAttempt but for past papers
export async function savePaperResult(result: PastPaperResult): Promise<void> {
  const db = await getDb();
  await runInTransaction(db, async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO paper_results (id, past_paper_id, payload, taken_at, synced)
         VALUES (?, ?, ?, ?, 0)`,
      result.id,
      result.pastPaperId,
      JSON.stringify(result),
      result.takenAt,
    );
    await enqueue(db, {
      entity: 'paperResult',
      op: 'create',
      entityId: result.id,
      payload: result,
    });
  });
}

export async function markPaperResultSynced(resultId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE paper_results SET synced = 1 WHERE id = ?', resultId);
}

// newest first
export async function getPaperResults(): Promise<PastPaperResult[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT payload FROM paper_results ORDER BY taken_at DESC',
  );
  return rows.map((r) => JSON.parse(r.payload) as PastPaperResult);
}

// for the unsynced count in settings
export async function unsyncedCounts(): Promise<{ attempts: number; results: number }> {
  const db = await getDb();
  const a = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM quiz_attempts WHERE synced = 0',
  );
  const r = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM paper_results WHERE synced = 0',
  );
  return { attempts: a?.n ?? 0, results: r?.n ?? 0 };
}
