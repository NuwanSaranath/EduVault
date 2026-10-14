import {
  clamp,
  easeInOut,
  lerp,
  nextStageStart,
  previousStageStart,
  project,
  pulse,
  seeded,
  segment,
  stageAt,
  stageIndexAt,
  stageProgress,
  stagger,
  type Stage,
} from '../timing';

const stages: Stage[] = [
  { id: 'a', at: 0, titleSi: 'එක', titleEn: 'One', captionSi: '...' },
  { id: 'b', at: 5, titleSi: 'දෙක', titleEn: 'Two', captionSi: '...' },
  { id: 'c', at: 12, titleSi: 'තුන', titleEn: 'Three', captionSi: '...' },
];
const DURATION = 20;

describe('segment', () => {
  it('is 0 before the window and 1 after it', () => {
    expect(segment(1, 4, 8)).toBe(0);
    expect(segment(9, 4, 8)).toBe(1);
  });

  it('interpolates linearly inside the window', () => {
    expect(segment(6, 4, 8)).toBeCloseTo(0.5, 6);
  });

  it('does not divide by zero on a degenerate window', () => {
    // A scene author can easily write the same number twice; this must not
    // produce NaN and blank the whole canvas.
    expect(Number.isFinite(segment(5, 5, 5))).toBe(true);
    expect(segment(5, 5, 5)).toBe(1);
    expect(segment(4, 5, 5)).toBe(0);
  });
});

describe('easing', () => {
  it('pins the endpoints exactly', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it('passes through the midpoint', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });

  it('clamps out-of-range input rather than overshooting', () => {
    expect(easeInOut(-2)).toBe(0);
    expect(easeInOut(3)).toBe(1);
  });
});

describe('pulse', () => {
  it('starts and ends at zero so it leaves no residue', () => {
    // A highlight that does not return to 0 would stay lit for the rest of the
    // scene, which is the bug this shape exists to prevent.
    expect(pulse(4, 4, 8)).toBeCloseTo(0, 6);
    expect(pulse(8, 4, 8)).toBeCloseTo(0, 6);
  });

  it('peaks in the middle', () => {
    expect(pulse(6, 4, 8)).toBeCloseTo(1, 6);
  });
});

describe('stagger', () => {
  it('starts later for later items', () => {
    const first = stagger(0, 4, 1.0, 0, 1, 0);
    const third = stagger(2, 4, 1.0, 0, 1, 0);
    expect(first).toBeGreaterThan(third);
  });

  it('completes every item eventually', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(stagger(i, 5, 100, 0, 1, 0)).toBe(1);
    }
  });

  it('handles an empty list without dividing by zero', () => {
    expect(stagger(0, 0, 5, 0, 1)).toBe(0);
  });
});

describe('stage lookup', () => {
  it('reports the stage active at a given time', () => {
    expect(stageAt(stages, 0)?.id).toBe('a');
    expect(stageAt(stages, 4.9)?.id).toBe('a');
    expect(stageAt(stages, 5)?.id).toBe('b');
    expect(stageAt(stages, 19)?.id).toBe('c');
  });

  it('falls back to the first stage before the timeline starts', () => {
    // A scene must always have a caption; -1 would render an empty panel.
    expect(stageIndexAt(stages, -3)).toBe(0);
  });

  it('returns -1 only when there are no stages at all', () => {
    expect(stageIndexAt([], 5)).toBe(-1);
    expect(stageAt([], 5)).toBeNull();
  });

  it('measures progress through the active stage', () => {
    expect(stageProgress(stages, 5, DURATION)).toBeCloseTo(0, 6);
    expect(stageProgress(stages, 8.5, DURATION)).toBeCloseTo(0.5, 6);
  });

  it('runs the final stage out to the scene duration', () => {
    expect(stageProgress(stages, 12, DURATION)).toBeCloseTo(0, 6);
    expect(stageProgress(stages, 20, DURATION)).toBeCloseTo(1, 6);
  });
});

describe('step navigation', () => {
  it('restarts the current stage when well into it', () => {
    // Same behaviour as a music player's previous-track button.
    expect(previousStageStart(stages, 9)).toBe(5);
  });

  it('jumps to the previous stage when only just inside the current one', () => {
    expect(previousStageStart(stages, 5.2)).toBe(0);
  });

  it('never steps back past the start', () => {
    expect(previousStageStart(stages, 0.1)).toBe(0);
  });

  it('advances to the next stage', () => {
    expect(nextStageStart(stages, 2, DURATION)).toBe(5);
    expect(nextStageStart(stages, 6, DURATION)).toBe(12);
  });

  it('advances to the end from the final stage', () => {
    expect(nextStageStart(stages, 15, DURATION)).toBe(DURATION);
  });
});

describe('geometry', () => {
  it('projects along 0° as +x', () => {
    const p = project(10, 10, 0, 5);
    expect(p.x).toBeCloseTo(15, 6);
    expect(p.y).toBeCloseTo(10, 6);
  });

  it('projects along 90° as +y, matching SVG orientation', () => {
    const p = project(10, 10, 90, 5);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(15, 6);
  });

  it('projects along 180° as a reversal', () => {
    const p = project(10, 10, 180, 5);
    expect(p.x).toBeCloseTo(5, 6);
  });
});

describe('seeded', () => {
  it('is deterministic — the same seed always gives the same value', () => {
    // The property the whole "pure function of t" rule depends on. If this
    // drifted, scattered particles would jitter on every frame.
    expect(seeded(7)).toBe(seeded(7));
    expect(seeded(42)).toBe(seeded(42));
  });

  it('stays within [0, 1)', () => {
    for (let i = 0; i < 200; i += 1) {
      const v = seeded(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('varies between seeds', () => {
    const values = new Set(Array.from({ length: 50 }, (_, i) => seeded(i)));
    expect(values.size).toBeGreaterThan(40);
  });
});

describe('basics', () => {
  it('clamps', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('interpolates', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
});
