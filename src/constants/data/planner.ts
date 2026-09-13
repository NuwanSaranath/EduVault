import type { PlannerEvent } from '@/types';

export const plannerSeed: PlannerEvent[] = [
  { id: 'pe-1', day: 'Mon', time: '18:00', subjectId: 'physics', activity: 'Theory — Mechanics', reminderEnabled: true },
  { id: 'pe-2', day: 'Mon', time: '19:00', subjectId: 'chemistry', activity: 'Quiz Practice', reminderEnabled: true },
  { id: 'pe-3', day: 'Tue', time: '17:30', subjectId: 'combined-maths', activity: 'Theory — Calculus', reminderEnabled: false },
  { id: 'pe-4', day: 'Wed', time: '18:00', subjectId: 'physics', activity: 'Past Paper Practice', reminderEnabled: true },
  { id: 'pe-5', day: 'Thu', time: '19:00', subjectId: 'biology', activity: 'Theory — Genetics', reminderEnabled: false },
  { id: 'pe-6', day: 'Fri', time: '18:30', subjectId: 'ict', activity: 'Quiz — Programming Concepts', reminderEnabled: true },
  { id: 'pe-7', day: 'Sat', time: '10:00', subjectId: 'combined-maths', activity: 'Full Past Paper (Timed)', reminderEnabled: true },
  { id: 'pe-8', day: 'Sun', time: '16:00', subjectId: 'chemistry', activity: 'Weekly Revision', reminderEnabled: false },
];

export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
