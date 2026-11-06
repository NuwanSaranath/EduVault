import type { Stream, Subject } from '@/types';
import { getSubjects } from '@/db/repositories/contentRepo';

// subjects come from sqlite, never the network. this is how all screens
// read data: ask the local db, get an answer straight away. keeping it fresh
// is the sync engine's job
export async function fetchSubjects(): Promise<Subject[]> {
  return getSubjects();
}

export async function fetchSubjectsForStream(stream: Stream): Promise<Subject[]> {
  const all = await getSubjects();
  // filter in js, streams is a json array in the payload and there are only
  // about 8 subjects
  return all.filter((subject) => subject.streams.includes(stream));
}

export async function fetchSubject(id: string): Promise<Subject | undefined> {
  const all = await getSubjects();
  return all.find((subject) => subject.id === id);
}
