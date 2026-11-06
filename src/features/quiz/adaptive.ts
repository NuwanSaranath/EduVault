import type { Question, QuizAttempt } from '@/types';

// Adaptive question picking.
// Students have limited time and lots of questions, picking randomly wastes
// time on stuff they already know. So each question gets a score and the
// session leans towards topics that are weak and haven't been done in a while.
//
//   priority = weakness x staleness x difficulty
//
// weakness   1 - accuracy for the topic. new topics start at 0.5 so they
//            still get picked
// staleness  goes back up with a 7 day half life. a topic done this morning
//            is near 0, so the same questions don't keep coming back
// difficulty small multiplier, only to break ties towards harder questions
//
// No db, clock or Math.random inside (now and random are passed in) so it's
// easy to test.

const DIFFICULTY_WEIGHT: Record<Question['difficulty'], number> = {
  Easy: 1.0,
  Medium: 1.15,
  Hard: 1.3,
};

// days for a topic to get halfway back to full staleness
export const HALF_LIFE_DAYS = 7;

// accuracy for a topic with no history yet
export const UNSEEN_ACCURACY = 0.5;

// 70% of the session from the top of the ranking, 30% from the rest.
// otherwise a student weak in one chapter would only ever see that chapter
export const FOCUS_RATIO = 0.7;

const MS_PER_DAY = 86_400_000;

export interface TopicStat {
  seen: number;
  correct: number;
  // time (ms) of the last answer on this topic
  lastSeenAt: number;
  accuracy: number;
}

export interface ScoredQuestion {
  question: Question;
  priority: number;
  weakness: number;
  staleness: number;
}

// chapter, or subject if there's no chapter
function topicKey(question: Question): string {
  return question.chapterId ?? `subject:${question.subjectId}`;
}

// work out accuracy and last seen time per topic from attempts.
// questions not in the pool any more (syllabus changed, evicted) are skipped
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

// 0 right after practice, goes towards 1 over time. never practised =
// one half life old
export function stalenessOf(lastSeenAt: number | undefined, now: number): number {
  const daysSince =
    lastSeenAt && lastSeenAt > 0 ? (now - lastSeenAt) / MS_PER_DAY : HALF_LIFE_DAYS;
  if (daysSince <= 0) return 0;
  return 1 - 2 ** (-daysSince / HALF_LIFE_DAYS);
}

// score every question, highest first. separate from selectAdaptiveQuestions
// so the progress screen can show why a topic is picked using the same numbers
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

    // the + 0.1 and + 0.2 stop one zero from making the whole score 0.
    // mastered topics should come last, not never
    const priority =
      (0.1 + weakness) * (0.2 + staleness) * DIFFICULTY_WEIGHT[question.difficulty];

    return { question, priority, weakness, staleness };
  });

  return scored.sort((a, b) => b.priority - a.priority || a.question.id.localeCompare(b.question.id));
}

export interface SelectOptions {
  count: number;
  now?: number;
  // for tests, defaults to Math.random
  random?: () => number;
  focusRatio?: number;
}

// pick the questions for one session. only returns less than count if the
// pool is smaller. shuffled at the end so the top ranked isn't always first
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

// weakest topics for progress + quiz summary. needs minSeen answers first,
// one wrong answer shouldn't make a chapter "weak"
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

// fisher-yates, random can be passed in for tests
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
