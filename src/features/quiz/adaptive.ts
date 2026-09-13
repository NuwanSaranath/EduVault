import type { Question, QuizAttempt } from '@/types';

/**
 * Constrained-design algorithm #1: adaptive question selection.
 *
 * The constraint is the student's time, not the device's. An A/L candidate has
 * a few hundred practice sessions before the exam and thousands of questions
 * available, so picking at random wastes most of them re-testing what the
 * student already knows. This scores every candidate question and biases the
 * session toward topics that are both weak and stale.
 *
 *   priority = weakness x staleness x difficulty
 *
 * weakness   1 - accuracy on that topic. Unseen topics start at 0.5 so they are
 *            explored rather than starved by topics with a known bad record.
 * staleness  Exponential decay with a 7-day half-life. A topic drilled this
 *            morning drops near zero and climbs back over the following week,
 *            which is what stops the same ten questions recurring every session.
 * difficulty A mild multiplier only. It breaks ties toward harder questions
 *            without letting difficulty override a genuine weakness signal.
 *
 * Entirely pure — no database, no clock, no global RNG — so the whole thing is
 * unit-testable and safe to reason about in a viva. `now` and `random` are
 * injected for exactly that reason.
 */

const DIFFICULTY_WEIGHT: Record<Question['difficulty'], number> = {
  Easy: 1.0,
  Medium: 1.15,
  Hard: 1.3,
};

/** Days for a topic's staleness to recover halfway back to full weight. */
export const HALF_LIFE_DAYS = 7;

/** Accuracy assumed for a topic with no history: neither weak nor mastered. */
export const UNSEEN_ACCURACY = 0.5;

/**
 * Share of each session drawn from the top of the priority ranking.
 *
 * The remaining 30% is sampled from the tail. Without it the algorithm tunnels:
 * a student weak in one chapter would see nothing else until it was fixed, which
 * is both demoralising and bad exam preparation.
 */
export const FOCUS_RATIO = 0.7;

const MS_PER_DAY = 86_400_000;

export interface TopicStat {
  seen: number;
  correct: number;
  /** Epoch ms of the most recent answer on this topic. */
  lastSeenAt: number;
  accuracy: number;
}

export interface ScoredQuestion {
  question: Question;
  priority: number;
  weakness: number;
  staleness: number;
}

/** Topic key. Falls back to subject when a question has no chapter. */
function topicKey(question: Question): string {
  return question.chapterId ?? `subject:${question.subjectId}`;
}

/**
 * Folds attempt history into per-topic accuracy and recency.
 *
 * Answers reference questions by id, so the caller supplies the pool to resolve
 * each id back to its topic. Questions no longer in the pool (syllabus changed,
 * cache evicted) are skipped rather than bucketed as 'unknown', which would
 * pollute a real topic's stats.
 */
export function buildTopicStats(
  attempts: QuizAttempt[],
  pool: Question[],
): Map<string, TopicStat> {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const stats = new Map<string, TopicStat>();

  for (const attempt of attempts) {
    const takenAt = new Date(attempt.takenAt).getTime();
    if (Number.isNaN(takenAt)) continue;

    for (const answer of attempt.answers) {
      const question = byId.get(answer.questionId);
      if (!question) continue;

      const key = topicKey(question);
      const stat = stats.get(key) ?? { seen: 0, correct: 0, lastSeenAt: 0, accuracy: 0 };
      stat.seen += 1;
      if (answer.correct) stat.correct += 1;
      stat.lastSeenAt = Math.max(stat.lastSeenAt, takenAt);
      stat.accuracy = stat.correct / stat.seen;
      stats.set(key, stat);
    }
  }

  return stats;
}

/**
 * Staleness in [0, 1): 0 immediately after practice, approaching 1 as the topic
 * is left alone. A never-practised topic is treated as one half-life stale so it
 * competes with recently-missed material without dominating it.
 */
export function stalenessOf(lastSeenAt: number | undefined, now: number): number {
  const daysSince =
    lastSeenAt && lastSeenAt > 0 ? (now - lastSeenAt) / MS_PER_DAY : HALF_LIFE_DAYS;
  if (daysSince <= 0) return 0;
  return 1 - 2 ** (-daysSince / HALF_LIFE_DAYS);
}

/**
 * Scores the whole pool, highest priority first.
 *
 * Exposed separately from `selectAdaptiveQuestions` so the Progress screen can
 * show *why* a topic is being pushed ("weakest area: Atomic Structure") from the
 * same numbers the selector uses. One source of truth for the ranking.
 */
export function scoreQuestions(
  pool: Question[],
  attempts: QuizAttempt[],
  now: number = Date.now(),
): ScoredQuestion[] {
  const stats = buildTopicStats(attempts, pool);

  const scored = pool.map((question) => {
    const stat = stats.get(topicKey(question));
    const accuracy = stat && stat.seen > 0 ? stat.accuracy : UNSEEN_ACCURACY;
    const weakness = 1 - accuracy;
    const staleness = stalenessOf(stat?.lastSeenAt, now);

    // The additive floors (0.1, 0.2) stop a single zero factor from collapsing
    // priority to 0. A fully-mastered topic should rank last, not be excluded —
    // otherwise mastered material is never revised again.
    const priority =
      (0.1 + weakness) * (0.2 + staleness) * DIFFICULTY_WEIGHT[question.difficulty];

    return { question, priority, weakness, staleness };
  });

  return scored.sort((a, b) => b.priority - a.priority || a.question.id.localeCompare(b.question.id));
}

export interface SelectOptions {
  count: number;
  now?: number;
  /** Injected for deterministic tests; defaults to Math.random. */
  random?: () => number;
  /** Override the focus/explore split. */
  focusRatio?: number;
}

/**
 * Picks the questions for one session.
 *
 * Returns fewer than `count` only when the pool itself is smaller. The result is
 * shuffled at the end so the hardest-ranked question is not always question 1 —
 * the ranking decides *which* questions, not what order they are met in.
 */
export function selectAdaptiveQuestions(
  pool: Question[],
  attempts: QuizAttempt[],
  options: SelectOptions,
): Question[] {
  const { count, now = Date.now(), random = Math.random, focusRatio = FOCUS_RATIO } = options;

  if (count <= 0 || pool.length === 0) return [];
  if (pool.length <= count) return shuffle(pool, random);

  const scored = scoreQuestions(pool, attempts, now);

  const focusTarget = Math.min(Math.ceil(count * focusRatio), count);
  const focused = scored.slice(0, focusTarget).map((s) => s.question);

  const exploreTarget = count - focused.length;
  const explored = shuffle(
    scored.slice(focusTarget).map((s) => s.question),
    random,
  ).slice(0, exploreTarget);

  return shuffle([...focused, ...explored], random);
}

/**
 * Weakest topics, for the Progress screen and the post-quiz summary.
 *
 * Requires `minSeen` observations before calling a topic weak — one unlucky
 * answer is noise, and labelling a chapter a weakness on that basis would send
 * the student revising the wrong thing.
 */
export function weakestTopics(
  attempts: QuizAttempt[],
  pool: Question[],
  limit = 3,
  minSeen = 3,
): Array<{ topicId: string; accuracy: number; seen: number }> {
  const stats = buildTopicStats(attempts, pool);
  return [...stats.entries()]
    .filter(([, stat]) => stat.seen >= minSeen)
    .map(([topicId, stat]) => ({ topicId, accuracy: stat.accuracy, seen: stat.seen }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

/** Fisher-Yates with an injectable RNG so tests are deterministic. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
