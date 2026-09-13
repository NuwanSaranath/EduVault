import type { Stream, Subject } from '@/types';
import { fetchSubjectsForStream } from '@/services/subjects';
import { useAuthStore } from '@/store/authStore';
import { useAsyncData } from './useAsyncData';

/**
 * The signed-in student's subjects, read from SQLite.
 *
 * Five screens need exactly this, and each was previously importing the bundled
 * `subjectsForStream` directly — which meant a content update pulled from
 * Firestore would never appear on any of them. Centralising it here makes the
 * database the single read path and gives one place to change if subject
 * selection ever becomes per-user rather than per-stream.
 */
export function useStreamSubjects(): {
  subjects: Subject[];
  stream: Stream;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const stream: Stream = user?.stream ?? 'Physical Science';

  const { data, loading } = useAsyncData(() => fetchSubjectsForStream(stream), [stream]);

  return { subjects: data ?? [], stream, loading };
}
