export const palette = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#4F5FE0',
    600: '#3A3FC4',
    700: '#2D2FA0',
    800: '#22217A',
    900: '#1A1856',
  },
  accent: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: {
    50: '#F7F8FC',
    100: '#EEF0F7',
    200: '#E2E4F0',
    300: '#CBD0E0',
    400: '#9AA1B9',
    500: '#6B7290',
    600: '#4B5170',
    700: '#343A56',
    800: '#20233A',
    900: '#0F1020',
  },
};

export const gradients: Record<'primary' | 'primarySoft' | 'success', [string, string]> = {
  primary: [palette.primary[600], palette.accent[600]],
  primarySoft: [palette.primary[400], palette.accent[400]],
  success: [palette.success, palette.primary[500]],
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const chartColors = {
  light: {
    grid: palette.gray[200],
    label: palette.gray[600],
    bar: palette.primary[500],
    barAlt: palette.accent[500],
    background: '#FFFFFF',
  },
  dark: {
    grid: palette.gray[700],
    label: palette.gray[300],
    bar: palette.primary[400],
    barAlt: palette.accent[400],
    background: palette.gray[800],
  },
};

export const streams = [
  'Physical Science',
  'Biological Science',
  'Commerce',
  'Arts',
  'Technology',
] as const;

export type Stream = (typeof streams)[number];

export const districts = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kurunegala', 'Puttalam',
  'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura',
  'Kegalle', 'Batticaloa', 'Ampara', 'Trincomalee', 'Vavuniya', 'Kilinochchi', 'Mannar',
] as const;
