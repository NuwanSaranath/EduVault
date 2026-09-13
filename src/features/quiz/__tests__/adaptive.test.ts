import type { Question, QuizAttempt } from '@/types';
import {
  buildTopicStats,
  scoreQuestions,
  selectAdaptiveQuestions,
  stalenessOf,
  weakestTopics,
  HALF_LIFE_DAYS,
  UNSEEN_ACCURACY,
} from '../adaptive';

const NOW = new Date('2026-09-12T08:00:00.000Z').getTime();
const MS_PER_DAY = 86_400_000;

function question(id: string, chapterId: string, difficulty: Question['difficulty'] = 'Medium'): Question {
  return {
    id,
    subjectId: 'physics',
    chapterId,
    type: 'MCQ',
    prompt: `Q ${id}`,
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 'a',
    explanation: '',
    difficulty,
  };
}

function attempt(
  id: string,
  daysAgo: number,
  answers: Array<[questionId: string, correct: boolean]>,
): QuizAttempt {
  return {
    id,
    subjectId: 'physics',
    quizType: 'MCQ',
    answers: answers.map(([questionId, correct]) => ({
      questionId,
      givenAnswer: correct ? 'a' : 'b',
      correct,
    })),
    score: answers.filter(([, c]) => c).length,
    totalQuestions: answers.length,
    xpEarned: 10,
    takenAt: new Date(NOW - daysAgo * MS_PER_DAY).toISOString(),
    durationSeconds: 120,
  };
}

/** Deterministic RNG so shuffles are reproducible across runs. */
function seededRandom(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

describe('stalenessOf', () => {
  it('is 0 for a topic practised right now', () => {
    expect(stalenessOf(NOW, NOW)).toBe(0);
  });

  it('is 0.5 after exactly one half-life', () => {
    expect(stalenessOf(NOW - HALF_LIFE_DAYS * MS_PER_DAY, NOW)).toBeCloseTo(0.5, 5);
  });

  it('approaches 1 for long-neglected topics', () => {
    expect(stalenessOf(NOW - 365 * MS_PER_DAY, NOW)).toBeGreaterThan(0.99);
  });

  it('treats never-practised topics as one half-life stale', () => {
    expect(stalenessOf(undefined, NOW)).toBeCloseTo(0.5, 5);
  });
});

describe('buildTopicStats', () => {
  const pool = [question('q1', 'ch1'), question('q2', 'ch1'), question('q3', 'ch2')];

  it('aggregates accuracy per chapter, not per question', () => {
    const stats = buildTopicStats([attempt('a1', 1, [['q1', true], ['q2', false]])], pool);
    expect(stats.get('ch1')).toMatchObject({ seen: 2, correct: 1, accuracy: 0.5 });
  });

  it('keeps the most recent timestamp across attempts', () => {
    const stats = buildTopicStats(
      [attempt('a1', 10, [['q1', true]]), attempt('a2', 2, [['q2', true]])],
      pool,
    );
    expect(stats.get('ch1')!.lastSeenAt).toBe(NOW - 2 * MS_PER_DAY);
  });

  it('ignores answers whose question is no longer in the pool', () => {
    // A question evicted from cache or dropped from the syllabus must not be
    // bucketed into a fake topic, which would distort a real chapter's score.
    const stats = buildTopicStats([attempt('a1', 1, [['deleted-q', false]])], pool);
    expect(stats.size).toBe(0);
  });

  it('falls back to the subject when a question has no chapter', () => {
    const orphan: Question = { ...question('q9', 'ignored'), chapterId: undefined };
    const stats = buildTopicStats([attempt('a1', 1, [['q9', true]])], [orphan]);
    expect(stats.has('subject:physics')).toBe(true);
  });
});

describe('scoreQuestions', () => {
  const pool = [question('weak', 'ch1'), question('strong', 'ch2')];

  it('ranks a weak topic above a mastered one at equal staleness', () => {
    const attempts = [
      attempt('a1', 3, [['weak', false], ['weak', false]]),
      attempt('a2', 3, [['strong', true], ['strong', true]]),
    ];
    const [first] = scoreQuestions(pool, attempts, NOW);
    expect(first.question.id).toBe('weak');
  });

  it('never assigns zero priority to a fully mastered topic', () => {
    // Mastered material must still be revisable, just last in line.
    const attempts = [attempt('a1', 0, [['strong', true], ['strong', true]])];
    const scored = scoreQuestions(pool, attempts, NOW);
    expect(scored.every((s) => s.priority > 0)).toBe(true);
  });

  it('demotes a topic practised today below an equally weak stale one', () => {
    const attempts = [
      attempt('fresh', 0, [['weak', false]]),
      attempt('stale', 30, [['strong', false]]),
    ];
    const scored = scoreQuestions(pool, attempts, NOW);
    expect(scored[0].question.id).toBe('strong');
  });

  it('treats an unseen topic as mid-accuracy rather than weakest', () => {
    const attempts = [attempt('a1', 3, [['weak', false], ['weak', false]])];
    const scored = scoreQuestions(pool, attempts, NOW);
    const unseen = scored.find((s) => s.question.id === 'strong')!;
    expect(unseen.weakness).toBeCloseTo(1 - UNSEEN_ACCURACY, 5);
  });

  it('breaks ties on difficulty, harder first', () => {
    const tiePool = [question('easy', 'ch1', 'Easy'), question('hard', 'ch1', 'Hard')];
    const scored = scoreQuestions(tiePool, [], NOW);
    expect(scored[0].question.id).toBe('hard');
  });

  it('is deterministic for identical input', () => {
    const attempts = [attempt('a1', 2, [['weak', false]])];
    const a = scoreQuestions(pool, attempts, NOW).map((s) => s.question.id);
    const b = scoreQuestions(pool, attempts, NOW).map((s) => s.question.id);
    expect(a).toEqual(b);
  });
});

describe('selectAdaptiveQuestions', () => {
  const pool = Array.from({ length: 20 }, (_, i) =>
    question(`q${i}`, i < 10 ? 'weak-ch' : 'strong-ch'),
  );
  const attempts = [
    attempt('a1', 5, [['q0', false], ['q1', false], ['q2', false]]),
    attempt('a2', 5, [['q10', true], ['q11', true], ['q12', true]]),
  ];

  it('returns exactly the requested count', () => {
    const picked = selectAdaptiveQuestions(pool, attempts, {
      count: 10,
      now: NOW,
      random: seededRandom(),
    });
    expect(picked).toHaveLength(10);
  });

  it('returns no duplicates', () => {
    const picked = selectAdaptiveQuestions(pool, attempts, {
      count: 10,
      now: NOW,
      random: seededRandom(),
    });
    expect(new Set(picked.map((q) => q.id)).size).toBe(10);
  });

  it('weights the session toward the weak chapter', () => {
    const picked = selectAdaptiveQuestions(pool, attempts, {
      count: 10,
      now: NOW,
      random: seededRandom(),
    });
    const weakCount = picked.filter((q) => q.chapterId === 'weak-ch').length;
    expect(weakCount).toBeGreaterThanOrEqual(7); // the 70% focus share
  });

  it('still explores outside the weak chapter', () => {
    // Guards the anti-tunnelling rule: an all-weak session would fail this.
    const picked = selectAdaptiveQuestions(pool, attempts, {
      count: 10,
      now: NOW,
      random: seededRandom(),
    });
    expect(picked.some((q) => q.chapterId === 'strong-ch')).toBe(true);
  });

  it('returns the whole pool when it is smaller than the requested count', () => {
    const small = pool.slice(0, 3);
    const picked = selectAdaptiveQuestions(small, attempts, { count: 10, now: NOW });
    expect(picked).toHaveLength(3);
  });

  it('handles a cold start with no history', () => {
    const picked = selectAdaptiveQuestions(pool, [], {
      count: 5,
      now: NOW,
      random: seededRandom(),
    });
    expect(picked).toHaveLength(5);
  });

  it('returns empty for a non-positive count', () => {
    expect(selectAdaptiveQuestions(pool, attempts, { count: 0, now: NOW })).toEqual([]);
  });

  it('returns empty for an empty pool', () => {
    expect(selectAdaptiveQuestions([], attempts, { count: 5, now: NOW })).toEqual([]);
  });
});

describe('weakestTopics', () => {
  const pool = [question('q1', 'ch1'), question('q2', 'ch2'), question('q3', 'ch3')];

  it('ranks by accuracy ascending', () => {
    const attempts = [
      attempt('a1', 1, [['q1', false], ['q1', false], ['q1', false]]),
      attempt('a2', 1, [['q2', true], ['q2', false], ['q2', true]]),
    ];
    expect(weakestTopics(attempts, pool, 2).map((t) => t.topicId)).toEqual(['ch1', 'ch2']);
  });

  it('ignores topics below the minimum observation count', () => {
    // One wrong answer is noise, not a weakness worth acting on.
    const attempts = [attempt('a1', 1, [['q3', false]])];
    expect(weakestTopics(attempts, pool, 3, 3)).toEqual([]);
  });
});
