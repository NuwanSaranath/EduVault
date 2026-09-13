export const XP_PER_CORRECT_ANSWER = 10;
export const XP_DAILY_CHALLENGE_BONUS = 25;

const LEVEL_TITLES = [
  'Curious Beginner',
  'Diligent Student',
  'Focused Learner',
  'Physics Explorer',
  'Subject Strategist',
  'A/L Achiever',
  'Exam Champion',
];

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export function xpIntoCurrentLevel(xp: number): { current: number; required: number } {
  const level = levelForXp(xp);
  const levelFloor = (level - 1) * 500;
  return { current: xp - levelFloor, required: 500 };
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export function xpForQuizAnswers(correctCount: number, isDailyChallenge = false): number {
  return correctCount * XP_PER_CORRECT_ANSWER + (isDailyChallenge ? XP_DAILY_CHALLENGE_BONUS : 0);
}
