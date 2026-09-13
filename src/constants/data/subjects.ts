import type { Subject } from '@/types';

export const subjects: Subject[] = [
  {
    id: 'combined-maths',
    name: 'Combined Mathematics',
    icon: 'calculator-outline',
    color: '#4F5FE0',
    streams: ['Physical Science'],
    totalChapters: 24,
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: 'planet-outline',
    color: '#3A3FC4',
    streams: ['Physical Science', 'Biological Science'],
    totalChapters: 22,
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: 'flask-outline',
    color: '#8B5CF6',
    streams: ['Physical Science', 'Biological Science'],
    totalChapters: 20,
  },
  {
    id: 'ict',
    name: 'Information & Communication Technology',
    icon: 'laptop-outline',
    color: '#22C55E',
    streams: ['Physical Science', 'Biological Science', 'Commerce', 'Technology'],
    totalChapters: 16,
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: 'leaf-outline',
    color: '#16A34A',
    streams: ['Biological Science'],
    totalChapters: 21,
  },
  {
    id: 'business-studies',
    name: 'Business Studies',
    icon: 'briefcase-outline',
    color: '#F59E0B',
    streams: ['Commerce'],
    totalChapters: 18,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    icon: 'cash-outline',
    color: '#EAB308',
    streams: ['Commerce'],
    totalChapters: 19,
  },
  {
    id: 'economics',
    name: 'Economics',
    icon: 'trending-up-outline',
    color: '#0EA5E9',
    streams: ['Commerce', 'Arts'],
    totalChapters: 17,
  },
  {
    id: 'political-science',
    name: 'Political Science',
    icon: 'people-outline',
    color: '#EF4444',
    streams: ['Arts'],
    totalChapters: 15,
  },
  {
    id: 'geography',
    name: 'Geography',
    icon: 'earth-outline',
    color: '#059669',
    streams: ['Arts'],
    totalChapters: 16,
  },
  {
    id: 'logic',
    name: 'Logic & Scientific Method',
    icon: 'bulb-outline',
    color: '#A855F7',
    streams: ['Arts'],
    totalChapters: 14,
  },
  {
    id: 'engineering-tech',
    name: 'Engineering Technology',
    icon: 'construct-outline',
    color: '#DC2626',
    streams: ['Technology'],
    totalChapters: 18,
  },
  {
    id: 'science-for-tech',
    name: 'Science for Technology',
    icon: 'hardware-chip-outline',
    color: '#2563EB',
    streams: ['Technology'],
    totalChapters: 17,
  },
  {
    id: 'general-english',
    name: 'General English',
    icon: 'chatbubbles-outline',
    color: '#F97316',
    streams: [
      'Physical Science',
      'Biological Science',
      'Commerce',
      'Arts',
      'Technology',
    ],
    totalChapters: 10,
  },
];

export function subjectsForStream(stream: string): Subject[] {
  return subjects.filter((subject) => subject.streams.includes(stream as never));
}

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((subject) => subject.id === id);
}
