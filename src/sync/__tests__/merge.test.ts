import type { PlannerEvent } from '@/types';
import { EMPTY_SNAPSHOT, type ProgressSnapshot } from '@/features/progress/snapshot';
import { mergeAppendOnly, mergePlannerEvent, mergeProgress } from '../merge';

function snapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return { ...EMPTY_SNAPSHOT, ...overrides };
}

describe('mergeProgress', () => {
  it('takes the higher XP rather than the newer one', () => {
    // The whole reason progress is not last-write-wins: a phone that synced
    // later must not erase XP earned on a tablet.
    const local = snapshot({ xp: 300, updatedAt: '2026-09-12T10:00:00.000Z' });
    const remote = snapshot({ xp: 900, updatedAt: '2026-09-11T10:00:00.000Z' });
    expect(mergeProgress(local, remote).xp).toBe(900);
  });

  it('takes the higher streak', () => {
    expect(mergeProgress(snapshot({ streakDays: 4 }), snapshot({ streakDays: 11 })).streakDays).toBe(11);
  });

  it('unions completed chapters', () => {
    const merged = mergeProgress(
      snapshot({ completedChapterIds: ['ch1', 'ch2'] }),
      snapshot({ completedChapterIds: ['ch2', 'ch3'] }),
    );
    expect(merged.completedChapterIds.sort()).toEqual(['ch1', 'ch2', 'ch3']);
  });

  it('unions badges without duplicating', () => {
    const merged = mergeProgress(
      snapshot({ unlockedBadgeIds: ['first-quiz'] }),
      snapshot({ unlockedBadgeIds: ['first-quiz', 'streak-7'] }),
    );
    expect(merged.unlockedBadgeIds).toHaveLength(2);
  });

  it('keeps the later study date', () => {
    const merged = mergeProgress(
      snapshot({ lastStudyDateIso: '2026-09-10T00:00:00.000Z' }),
      snapshot({ lastStudyDateIso: '2026-09-12T00:00:00.000Z' }),
    );
    expect(merged.lastStudyDateIso).toBe('2026-09-12T00:00:00.000Z');
  });

  it('handles a null study date on either side', () => {
    expect(
      mergeProgress(snapshot({ lastStudyDateIso: null }), snapshot({ lastStudyDateIso: '2026-01-01T00:00:00.000Z' }))
        .lastStudyDateIso,
    ).toBe('2026-01-01T00:00:00.000Z');
  });

  it('is commutative — order of arrival cannot change the result', () => {
    // This is the property that makes convergence safe regardless of which
    // device pushes first.
    const a = snapshot({ xp: 120, completedChapterIds: ['ch1'], streakDays: 3 });
    const b = snapshot({ xp: 400, completedChapterIds: ['ch2'], streakDays: 9 });
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect({ ...ab, completedChapterIds: ab.completedChapterIds.sort() }).toEqual({
      ...ba,
      completedChapterIds: ba.completedChapterIds.sort(),
    });
  });

  it('is idempotent — re-merging the same snapshot changes nothing', () => {
    const a = snapshot({ xp: 500, completedChapterIds: ['ch1'] });
    expect(mergeProgress(a, a)).toEqual(a);
  });
});

describe('mergePlannerEvent', () => {
  const base: PlannerEvent = {
    id: 'ev1',
    day: 'Mon',
    time: '18:00',
    subjectId: 'physics',
    activity: 'Revision',
    reminderEnabled: true,
  };

  it('takes the newer side', () => {
    const merged = mergePlannerEvent(
      { event: { ...base, activity: 'Old' }, updatedAt: '2026-09-10T00:00:00.000Z' },
      { event: { ...base, activity: 'New' }, updatedAt: '2026-09-12T00:00:00.000Z' },
    );
    expect(merged!.activity).toBe('New');
  });

  it('resolves ties to local', () => {
    // The device in the student's hand expressed the most recent intent.
    const stamp = '2026-09-12T00:00:00.000Z';
    const merged = mergePlannerEvent(
      { event: { ...base, activity: 'Local' }, updatedAt: stamp },
      { event: { ...base, activity: 'Remote' }, updatedAt: stamp },
    );
    expect(merged!.activity).toBe('Local');
  });

  it('accepts a remote-only event', () => {
    expect(mergePlannerEvent(null, { event: base, updatedAt: 'x' })!.id).toBe('ev1');
  });

  it('accepts a local-only event', () => {
    expect(mergePlannerEvent({ event: base, updatedAt: 'x' }, null)!.id).toBe('ev1');
  });

  it('returns null when neither side has the event', () => {
    expect(mergePlannerEvent(null, null)).toBeNull();
  });
});

describe('mergeAppendOnly', () => {
  const item = (id: string, takenAt: string) => ({ id, takenAt });

  it('de-duplicates by id so a pushed-then-pulled row appears once', () => {
    const merged = mergeAppendOnly(
      [item('a1', '2026-09-12T00:00:00.000Z')],
      [item('a1', '2026-09-12T00:00:00.000Z')],
    );
    expect(merged).toHaveLength(1);
  });

  it('keeps the union of both sides', () => {
    const merged = mergeAppendOnly(
      [item('local', '2026-09-12T00:00:00.000Z')],
      [item('remote', '2026-09-11T00:00:00.000Z')],
    );
    expect(merged).toHaveLength(2);
  });

  it('sorts newest first', () => {
    const merged = mergeAppendOnly(
      [item('old', '2026-01-01T00:00:00.000Z')],
      [item('new', '2026-09-12T00:00:00.000Z')],
    );
    expect(merged.map((m) => m.id)).toEqual(['new', 'old']);
  });
});
