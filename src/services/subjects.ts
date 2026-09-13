import type { Stream, Subject } from '@/types';
import { getSubjects } from '@/db/repositories/contentRepo';

/**
 * Subjects read from SQLite, never from the network.
 *
 * This is the core read pattern for the whole app: screens ask the local
 * database and get an answer immediately, online or off. Freshness is the sync
 * engine's job, not the caller's, so no screen ever has to handle a "loading
 * from server" state for content.
 */
export async function fetchSubjects(): Promise<Subject[]> {
  return getSubjects();
}

export async function fetchSubjectsForStream(stream: Stream): Promise<Subject[]> {
  const all = await getSubjects();
  // Filtered in JS rather than SQL: `streams` is a JSON array inside the payload,
  // and the subject count is ~8. Indexing it would cost a join table to save
  // nothing measurable.
  return all.filter((subject) => subject.streams.includes(stream));
}

export async function fetchSubject(id: string): Promise<Subject | undefined> {
  const all = await getSubjects();
  return all.find((subject) => subject.id === id);
}
