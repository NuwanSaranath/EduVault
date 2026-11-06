import type { SQLiteDatabase } from 'expo-sqlite';
import type { Chapter, Lesson, PastPaper, Question, Subject } from '@/types';
import { getDb, runInTransaction } from '../index';

// Syllabus content cached from firestore (read only).
// Whole object goes in `payload` as json, only columns we filter/sort on get
// their own column. Lessons get new fields a lot so this avoids migrations.

interface PayloadRow {
  payload: string;
}

function parse<T>(rows: PayloadRow[]): T[] {
  return rows.map((r) => JSON.parse(r.payload) as T);
}

// rough size of a payload for the cache limit
function byteLength(value: string): number {
  // count utf-8 bytes not string length, lessons have sinhala text
  let bytes = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

// writes (used by pull and the seeder)

export async function upsertSubjects(db: SQLiteDatabase, items: Subject[], updatedAt: string) {
  await runInTransaction(db, async () => {
    for (const item of items) {
      await db.runAsync(
        'INSERT OR REPLACE INTO subjects (id, payload, updated_at) VALUES (?, ?, ?)',
        item.id,
        JSON.stringify(item),
        updatedAt,
      );
    }
  });
}

export async function upsertChapters(db: SQLiteDatabase, items: Chapter[], updatedAt: string) {
  await runInTransaction(db, async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO chapters (id, subject_id, sort_order, payload, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        item.id,
        item.subjectId,
        item.order,
        JSON.stringify(item),
        updatedAt,
      );
    }
  });
}

// also stores the byte size
export async function upsertLessons(db: SQLiteDatabase, items: Lesson[], updatedAt: string) {
  await runInTransaction(db, async () => {
    for (const item of items) {
      const payload = JSON.stringify(item);
      // COALESCE keeps last_read_at, otherwise every refresh would make the
      // lesson look unread and it'd get evicted first
      await db.runAsync(
        `INSERT INTO lessons (id, chapter_id, payload, updated_at, bytes)
           VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           chapter_id = excluded.chapter_id,
           payload    = excluded.payload,
           updated_at = excluded.updated_at,
           bytes      = excluded.bytes`,
        item.id,
        item.chapterId,
        payload,
        updatedAt,
        byteLength(payload),
      );
    }
  });
}

export async function upsertQuestions(db: SQLiteDatabase, items: Question[], updatedAt: string) {
  await runInTransaction(db, async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO questions
           (id, subject_id, chapter_id, difficulty, type, payload, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.subjectId,
        item.chapterId ?? null,
        item.difficulty,
        item.type,
        JSON.stringify(item),
        updatedAt,
      );
    }
  });
}

export async function upsertPastPapers(db: SQLiteDatabase, items: PastPaper[], updatedAt: string) {
  await runInTransaction(db, async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO past_papers (id, subject_id, year, payload, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        item.id,
        item.subjectId,
        item.year,
        JSON.stringify(item),
        updatedAt,
      );
    }
  });
}

// reads (used by services)

export async function getSubjects(): Promise<Subject[]> {
  const db = await getDb();
  return parse<Subject>(await db.getAllAsync<PayloadRow>('SELECT payload FROM subjects'));
}

// in syllabus order
export async function getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
  const db = await getDb();
  return parse<Chapter>(
    await db.getAllAsync<PayloadRow>(
      'SELECT payload FROM chapters WHERE subject_id = ? ORDER BY sort_order ASC',
      subjectId,
    ),
  );
}

export async function getChapter(chapterId: string): Promise<Chapter | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload FROM chapters WHERE id = ?',
    chapterId,
  );
  return row ? (JSON.parse(row.payload) as Chapter) : null;
}

export async function getLessonsByChapter(chapterId: string): Promise<Lesson[]> {
  const db = await getDb();
  return parse<Lesson>(
    await db.getAllAsync<PayloadRow>(
      'SELECT payload FROM lessons WHERE chapter_id = ?',
      chapterId,
    ),
  );
}

// also updates last_read_at. without this every lesson looks the same age
// and the cache would delete random ones
export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload FROM lessons WHERE id = ?',
    lessonId,
  );
  if (!row) return null;
  await db.runAsync(
    'UPDATE lessons SET last_read_at = ? WHERE id = ?',
    new Date().toISOString(),
    lessonId,
  );
  return JSON.parse(row.payload) as Lesson;
}

export async function getQuestionsBySubject(subjectId: string): Promise<Question[]> {
  const db = await getDb();
  return parse<Question>(
    await db.getAllAsync<PayloadRow>(
      'SELECT payload FROM questions WHERE subject_id = ?',
      subjectId,
    ),
  );
}

export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  return parse<Question>(
    await db.getAllAsync<PayloadRow>(
      `SELECT payload FROM questions WHERE id IN (${placeholders})`,
      ...ids,
    ),
  );
}

export async function getAllQuestions(): Promise<Question[]> {
  const db = await getDb();
  return parse<Question>(await db.getAllAsync<PayloadRow>('SELECT payload FROM questions'));
}

// subjectId is optional
export async function getPastPapers(subjectId?: string): Promise<PastPaper[]> {
  const db = await getDb();
  const rows = subjectId
    ? await db.getAllAsync<PayloadRow>(
        'SELECT payload FROM past_papers WHERE subject_id = ? ORDER BY year DESC',
        subjectId,
      )
    : await db.getAllAsync<PayloadRow>('SELECT payload FROM past_papers ORDER BY year DESC');
  return parse<PastPaper>(rows);
}

export async function getPastPaper(paperId: string): Promise<PastPaper | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PayloadRow>(
    'SELECT payload FROM past_papers WHERE id = ?',
    paperId,
  );
  return row ? (JSON.parse(row.payload) as PastPaper) : null;
}

// true if nothing was loaded yet, caller should seed
export async function isContentEmpty(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM subjects');
  return (row?.n ?? 0) === 0;
}

// lessons to suggest on home. not opened ones first, skip chapters that
// are already done
export async function getRecommendedLessons(
  limit: number,
  excludeChapterIds: string[],
): Promise<Lesson[]> {
  const db = await getDb();
  const placeholders = excludeChapterIds.map(() => '?').join(',');
  const exclusion = excludeChapterIds.length > 0 ? `WHERE chapter_id NOT IN (${placeholders})` : '';

  const rows = await db.getAllAsync<PayloadRow>(
    `SELECT payload FROM lessons
       ${exclusion}
       ORDER BY last_read_at IS NULL DESC, last_read_at ASC
       LIMIT ?`,
    ...excludeChapterIds,
    limit,
  );
  return parse<Lesson>(rows);
}
