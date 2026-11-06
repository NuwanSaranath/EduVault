import { palette } from '@/constants/theme';
import type { SceneColors } from './types';

// same colours in every scene, e.g. proton always red, electron always blue.
// if each scene used different colours students would have to relearn them
// and couldn't compare diagrams
export function sceneColors(isDark: boolean): SceneColors {
  return isDark
    ? {
        bg: palette.gray[900],
        grid: palette.gray[700],
        axis: palette.gray[500],
        label: palette.gray[300],
        labelStrong: '#FFFFFF',
        proton: '#F87171',
        neutron: '#9CA3AF',
        electron: '#60A5FA',
        nucleus: '#FB923C',
        beam: '#FCD34D',
        highlight: palette.accent[400],
        danger: '#F87171',
        success: '#4ADE80',
        muted: palette.gray[600],
      }
    : {
        bg: '#FFFFFF',
        grid: palette.gray[200],
        axis: palette.gray[400],
        label: palette.gray[600],
        labelStrong: palette.gray[900],
        proton: '#DC2626',
        neutron: '#6B7280',
        electron: '#2563EB',
        nucleus: '#EA580C',
        beam: '#D97706',
        highlight: palette.accent[600],
        danger: palette.danger,
        success: '#16A34A',
        muted: palette.gray[400],
      };
}

// legend shown under every scene
export const PARTICLE_LEGEND: Array<{ key: keyof SceneColors; labelSi: string }> = [
  { key: 'proton', labelSi: 'ප්‍රෝටෝන (+)' },
  { key: 'neutron', labelSi: 'නියුට්‍රෝන (0)' },
  { key: 'electron', labelSi: 'ඉලෙක්ට්‍රෝන (−)' },
];
