import type { Achievement, LeaderboardEntry } from '@/types';

export const achievements: Achievement[] = [
  { id: 'ach-quiz-master', title: 'Quiz Master', description: 'Score 90%+ on 5 quizzes', icon: 'trophy', unlockedAt: '2026-06-12T10:00:00.000Z' },
  { id: 'ach-streak-30', title: '30 Day Streak', description: 'Study for 30 days in a row', icon: 'flame', unlockedAt: '2026-07-20T10:00:00.000Z' },
  { id: 'ach-first-paper', title: 'First Attempt', description: 'Complete your first past paper', icon: 'document-text', unlockedAt: '2026-05-02T10:00:00.000Z' },
  { id: 'ach-physics-explorer', title: 'Physics Explorer', description: 'Complete all Mechanics lessons', icon: 'planet' },
  { id: 'ach-night-owl', title: 'Night Owl', description: 'Complete a quiz after 10 PM', icon: 'moon' },
  { id: 'ach-perfect-score', title: 'Perfectionist', description: 'Get a perfect score on any quiz', icon: 'star' },
];

export const leaderboard: LeaderboardEntry[] = [
  { userId: 'u1', name: 'Sachini Perera', xp: 4820, rank: 1 },
  { userId: 'u2', name: 'Dinesh Fernando', xp: 4510, rank: 2 },
  { userId: 'u3', name: 'Nuwan Silva', xp: 4200, rank: 3 },
  { userId: 'u4', name: 'Amaya Jayasuriya', xp: 3990, rank: 4 },
  { userId: 'u5', name: 'Kavindu Rathnayake', xp: 3760, rank: 5 },
  { userId: 'u6', name: 'Thilini Wickramasinghe', xp: 3520, rank: 6 },
  { userId: 'me', name: 'You', xp: 3180, rank: 7 },
];
