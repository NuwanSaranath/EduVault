import { palette } from '@/constants/theme';
import type { SceneColors } from './types';

/**
 * One palette for every scene, resolved per theme.
 *
 * Centralised for a pedagogical reason rather than a stylistic one: a proton is
 * red in *every* animation, an electron blue in every animation. If the isotope
 * scene and the Rutherford scene coloured particles differently, a student would
 * have to re-learn the key each time and the two diagrams could not be compared.
 * Consistency of colour is part of the teaching, so it is not left to each scene.
 */
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

/** The key rendered under every scene, so the colours are never unexplained. */
export const PARTICLE_LEGEND: Array<{ key: keyof SceneColors; labelSi: string }> = [
  { key: 'proton', labelSi: 'ප්‍රෝටෝන (+)' },
  { key: 'neutron', labelSi: 'නියුට්‍රෝන (0)' },
  { key: 'electron', labelSi: 'ඉලෙක්ට්‍රෝන (−)' },
];
