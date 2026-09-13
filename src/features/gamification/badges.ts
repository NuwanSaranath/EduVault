import type { Achievement, QuizAttempt } from '@/types';

interface BadgeContext {
  quizAttempts: QuizAttempt[];
  streakDays: number;
  completedChapterIds: string[];
}

const badgeRules: Record<string, (ctx: BadgeContext) => boolean> = {
  'ach-quiz-master': (ctx) =>
    ctx.quizAttempts.filter((a) => a.score / a.totalQuestions >= 0.9).length >= 5,
  'ach-streak-30': (ctx) => ctx.streakDays >= 30,
  'ach-first-paper': (ctx) => ctx.quizAttempts.length >= 1,
  'ach-physics-explorer': (ctx) => ctx.completedChapterIds.includes('physics-ch1'),
  'ach-night-owl': (ctx) =>
    ctx.quizAttempts.some((a) => new Date(a.takenAt).getHours() >= 22),
  'ach-perfect-score': (ctx) => ctx.quizAttempts.some((a) => a.score === a.totalQuestions),
};

export function evaluateUnlockedBadgeIds(ctx: BadgeContext): string[] {
  return Object.entries(badgeRules)
    .filter(([, rule]) => rule(ctx))
    .map(([id]) => id);
}

export function mergeAchievementUnlocks(
  achievements: Achievement[],
  unlockedIds: string[],
): Achievement[] {
  const now = new Date().toISOString();
  return achievements.map((achievement) =>
    unlockedIds.includes(achievement.id) && !achievement.unlockedAt
      ? { ...achievement, unlockedAt: now }
      : achievement,
  );
}
