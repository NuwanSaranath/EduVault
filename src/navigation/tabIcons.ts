import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  subjects: { active: 'library', inactive: 'library-outline' },
  practice: { active: 'bulb', inactive: 'bulb-outline' },
  progress: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};
