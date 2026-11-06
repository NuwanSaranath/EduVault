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

// new level every 500 xp
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

// xp in this level and xp needed for the next
export function xpIntoCurrentLevel(xp: number): { current: number; required: number } {
  const level = levelForXp(xp);
  const levelFloor = (level - 1) * 500;
  return { current: xp - levelFloor, required: 500 };
}

// e.g. "Focused Learner"
export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

// 10 per correct answer + daily challenge bonus
export function xpForQuizAnswers(correctCount: number, isDailyChallenge = false): number {
  return correctCount * XP_PER_CORRECT_ANSWER + (isDailyChallenge ? XP_DAILY_CHALLENGE_BONUS : 0);
}
