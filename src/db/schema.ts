import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Bump this whenever the DDL below changes, and add a matching `if (version <
 * N)` block in `migrate`. The current version is stored in SQLite's own
 * `user_version` pragma, so migrations survive app restarts without a
 * separate bookkeeping table.
 */
export const SCHEMA_VERSION = 1;

export const DATABASE_NAME = 'eduvault.db';

/**
 * Applies any migrations the open database has not seen yet.
 *
 * Passed to `SQLiteProvider onInit`, so it runs exactly once per app launch
 * before any repository query is allowed to touch the connection.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  // WAL lets the sync engine write to the outbox while a screen is mid-read,
  // which matters because drains are triggered by NetInfo, not by the UI.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version >= SCHEMA_VERSION) return;

  if (version < 1) {
    await db.execAsync(`
      -- ── Cached read-only content, pulled from Firestore ──────────────────
      CREATE TABLE IF NOT EXISTS subjects (
        id          TEXT PRIMARY KEY NOT NULL,
        payload     TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chapters (
        id          TEXT PRIMARY KEY NOT NULL,
        subject_id  TEXT NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        payload     TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id            TEXT PRIMARY KEY NOT NULL,
        chapter_id    TEXT NOT NULL,
        payload       TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        last_read_at  TEXT,
        bytes         INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS questions (
        id          TEXT PRIMARY KEY NOT NULL,
        subject_id  TEXT NOT NULL,
        chapter_id  TEXT,
        difficulty  TEXT NOT NULL,
        type        TEXT NOT NULL,
        payload     TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS past_papers (
        id          TEXT PRIMARY KEY NOT NULL,
        subject_id  TEXT NOT NULL,
        year        INTEGER NOT NULL,
        payload     TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      -- ── User-owned data, written locally first ───────────────────────────
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id          TEXT PRIMARY KEY NOT NULL,
        subject_id  TEXT NOT NULL,
        payload     TEXT NOT NULL,
        taken_at    TEXT NOT NULL,
        synced      INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS paper_results (
        id             TEXT PRIMARY KEY NOT NULL,
        past_paper_id  TEXT NOT NULL,
        payload        TEXT NOT NULL,
        taken_at       TEXT NOT NULL,
        synced         INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS planner_events (
        id          TEXT PRIMARY KEY NOT NULL,
        payload     TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        deleted     INTEGER NOT NULL DEFAULT 0,
        synced      INTEGER NOT NULL DEFAULT 0
      );

      -- Pinned lessons: exempt from LRU eviction (see cachePolicy.ts).
      CREATE TABLE IF NOT EXISTS bookmarks (
        lesson_id   TEXT PRIMARY KEY NOT NULL,
        created_at  TEXT NOT NULL,
        synced      INTEGER NOT NULL DEFAULT 0
      );

      -- ── The sync mechanism ───────────────────────────────────────────────
      -- Every mutation is appended here in the same transaction that writes
      -- the local row, so "saved locally but never queued" is impossible.
      CREATE TABLE IF NOT EXISTS outbox (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        entity       TEXT NOT NULL,
        op           TEXT NOT NULL,
        entity_id    TEXT NOT NULL,
        payload      TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        attempts     INTEGER NOT NULL DEFAULT 0,
        last_error   TEXT,
        needs_media  INTEGER NOT NULL DEFAULT 0,
        media_uri    TEXT
      );

      -- Pull cursors, keyed by collection name.
      CREATE TABLE IF NOT EXISTS sync_meta (
        key    TEXT PRIMARY KEY NOT NULL,
        value  TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_created   ON outbox(created_at);
      CREATE INDEX IF NOT EXISTS idx_lessons_chapter  ON lessons(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_lessons_lru      ON lessons(last_read_at);
      CREATE INDEX IF NOT EXISTS idx_questions_subj   ON questions(subject_id);
      CREATE INDEX IF NOT EXISTS idx_questions_chap   ON questions(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_subj    ON chapters(subject_id);
      CREATE INDEX IF NOT EXISTS idx_attempts_subj    ON quiz_attempts(subject_id);
      CREATE INDEX IF NOT EXISTS idx_attempts_synced  ON quiz_attempts(synced);
      CREATE INDEX IF NOT EXISTS idx_papers_subj      ON past_papers(subject_id);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}
