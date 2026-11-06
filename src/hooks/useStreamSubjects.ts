import type { Stream, Subject } from '@/types';
import { fetchSubjectsForStream } from '@/services/subjects';
import { useAuthStore } from '@/store/authStore';
import { useAsyncData } from './useAsyncData';

// subjects for the logged in student's stream, from sqlite.
// screens used to import the bundled list directly so downloaded updates never
// showed up. now they all use this
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
